using ClientHub.API.Data;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClientHub.API.Services;

public class MessageService(AppDbContext db, ILogger<MessageService> logger)
{
    public async Task<List<MessageDto>> GetByConversationAsync(
        int conversationId, int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        var msgs = await db.Messages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Mark unread client messages as read in a single batch update
        var unreadIds = msgs
            .Where(m => !m.IsRead && m.SenderType == SenderType.Client)
            .Select(m => m.Id)
            .ToList();

        if (unreadIds.Count > 0)
        {
            await db.Messages
                .Where(m => unreadIds.Contains(m.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);
        }

        return msgs.Select(m => ToDto(m)).ToList();
    }

    public async Task<MessageDto> CreateAsync(
        int conversationId, int senderId, string body, CancellationToken ct = default)
    {
        var sender = await db.Users.FindAsync([senderId], ct)
            ?? throw new KeyNotFoundException($"Sender {senderId} not found.");

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId       = senderId,
            SenderType     = SenderType.Agent,
            Body           = body.Trim(),
            IsRead         = true,
        };
        db.Messages.Add(msg);

        var conv = await db.Conversations.FindAsync([conversationId], ct);
        if (conv is not null) conv.LastMessageAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        logger.LogDebug("Message {Id} created in conversation {ConvId} by user {UserId}",
            msg.Id, conversationId, senderId);
        return ToDto(msg, sender);
    }

    public static MessageDto ToDto(Message m, User? sender = null) => new(
        m.Id,
        m.ConversationId,
        m.SenderId,
        sender?.FullName ?? m.Sender?.FullName ?? "",
        m.SenderType.ToString().ToLower(),
        m.Body,
        m.CreatedAt,
        m.IsRead
    );
}
