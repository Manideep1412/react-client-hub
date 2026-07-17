using ClientHub.API.Data;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClientHub.API.Services;

public class ConversationService(AppDbContext db, ILogger<ConversationService> logger)
{
    public async Task<PagedResult<ConversationDto>> GetAllAsync(
        string? status, string? search,
        int page = 1, int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = db.Conversations.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ConversationStatus>(status, true, out var s))
            query = query.Where(c => c.Status == s);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c =>
                c.Subject.Contains(search) ||
                c.Contact.Name.Contains(search) ||
                c.Contact.Email.Contains(search));

        query = query.OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt);

        var total = await query.CountAsync(ct);

        // Project at DB level — no Include(Messages) loading every message into memory
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ConversationDto(
                c.Id,
                c.ContactId,
                c.Contact.Name,
                c.Contact.Email,
                c.Subject,
                c.Status.ToString().ToLower(),
                c.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Body).FirstOrDefault(),
                c.LastMessageAt,
                c.Messages.Count(m => !m.IsRead && m.SenderType == SenderType.Client),
                c.AssignedToId,
                c.AssignedTo != null ? c.AssignedTo.FullName : null,
                c.CreatedAt
            ))
            .ToListAsync(ct);

        logger.LogDebug("Fetched {Count}/{Total} conversations (page {Page})", items.Count, total, page);
        return new PagedResult<ConversationDto>(
            items, total, (int)Math.Ceiling(total / (double)pageSize), page, pageSize);
    }

    public async Task<ConversationDto?> GetByIdAsync(int id, CancellationToken ct = default) =>
        await db.Conversations
            .Where(c => c.Id == id)
            .Select(c => (ConversationDto?)new ConversationDto(
                c.Id,
                c.ContactId,
                c.Contact.Name,
                c.Contact.Email,
                c.Subject,
                c.Status.ToString().ToLower(),
                c.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Body).FirstOrDefault(),
                c.LastMessageAt,
                c.Messages.Count(m => !m.IsRead && m.SenderType == SenderType.Client),
                c.AssignedToId,
                c.AssignedTo != null ? c.AssignedTo.FullName : null,
                c.CreatedAt
            ))
            .FirstOrDefaultAsync(ct);

    public async Task<ConversationDto> CreateAsync(
        CreateConversationRequest req, int agentId,
        CancellationToken ct = default)
    {
        var conv = new Conversation
        {
            ContactId    = req.ContactId,
            Subject      = req.Subject,
            AssignedToId = agentId,
            LastMessageAt = DateTime.UtcNow,
        };
        db.Conversations.Add(conv);
        await db.SaveChangesAsync(ct);

        db.Messages.Add(new Message
        {
            ConversationId = conv.Id,
            SenderId       = agentId,
            SenderType     = SenderType.Agent,
            Body           = req.Body,
            IsRead         = true,
        });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Conversation {Id} created by agent {AgentId}", conv.Id, agentId);
        return (await GetByIdAsync(conv.Id, ct))!;
    }

    public async Task<ConversationDto?> UpdateStatusAsync(
        int id, string status, CancellationToken ct = default)
    {
        if (!Enum.TryParse<ConversationStatus>(status, true, out var s)) return null;
        var conv = await db.Conversations.FindAsync([id], ct);
        if (conv is null) return null;
        conv.Status = s;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Conversation {Id} status → {Status}", id, status);
        return await GetByIdAsync(id, ct);
    }
}
