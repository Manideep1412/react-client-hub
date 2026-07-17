using System.Security.Claims;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClientHub.API.Hubs;

[Authorize]
public class ChatHub(MessageService msgService, ConversationService convService) : Hub
{
    public async Task JoinConversation(int conversationId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(conversationId));

    public async Task LeaveConversation(int conversationId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(conversationId));

    public async Task SendMessage(int conversationId, string body)
    {
        var userId = int.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var msg    = await msgService.CreateAsync(conversationId, userId, body);
        // Broadcast to all connected agents — frontend filters by conversationId
        await Clients.All.SendAsync("ReceiveMessage", msg);

        var conv = await convService.GetByIdAsync(conversationId);
        if (conv is not null)
            await Clients.All.SendAsync("ConversationUpdated", conv);
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        await base.OnConnectedAsync();
    }

    private static string Group(int conversationId) => $"conv-{conversationId}";
}
