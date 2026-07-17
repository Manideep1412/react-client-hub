using System.Security.Claims;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClientHub.API.Controllers;

[ApiController, Authorize]
public class MessagesController(MessageService msgSvc) : ControllerBase
{
    [HttpGet("api/conversations/{conversationId:int}/messages")]
    public Task<List<MessageDto>> GetMessages(
        int conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
        => msgSvc.GetByConversationAsync(conversationId, page, pageSize, ct);

    [HttpPost("api/messages")]
    public async Task<ActionResult<MessageDto>> Send(
        SendMessageRequest req, CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await msgSvc.CreateAsync(req.ConversationId, userId, req.Body, ct));
    }
}
