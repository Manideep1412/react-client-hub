using ClientHub.API.Data;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClientHub.API.Services;

public class ContactService(AppDbContext db, ILogger<ContactService> logger)
{
    public async Task<PagedResult<ContactDto>> GetAllAsync(
        string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var query = db.Contacts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c =>
                c.Name.Contains(search) ||
                c.Email.Contains(search) ||
                (c.Company != null && c.Company.Contains(search)));

        query = query.OrderBy(c => c.Name);
        var total = await query.CountAsync(ct);

        // Project at DB level — no .Include(Conversations) loading all conversations
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ContactDto(
                c.Id, c.Name, c.Email, c.Company, c.CreatedAt,
                c.Conversations.Count))
            .ToListAsync(ct);

        return new PagedResult<ContactDto>(
            items, total, (int)Math.Ceiling(total / (double)pageSize), page, pageSize);
    }

    public async Task<ContactDto?> GetByIdAsync(int id, CancellationToken ct = default) =>
        await db.Contacts
            .Where(c => c.Id == id)
            .Select(c => (ContactDto?)new ContactDto(
                c.Id, c.Name, c.Email, c.Company, c.CreatedAt,
                c.Conversations.Count))
            .FirstOrDefaultAsync(ct);

    public async Task<ContactDto> CreateAsync(CreateContactRequest req, CancellationToken ct = default)
    {
        if (await db.Contacts.AnyAsync(c => c.Email == req.Email.Trim().ToLower(), ct))
            throw new InvalidOperationException($"A contact with email '{req.Email}' already exists.");

        var contact = new Contact
        {
            Name    = req.Name.Trim(),
            Email   = req.Email.Trim().ToLower(),
            Company = req.Company?.Trim(),
        };
        db.Contacts.Add(contact);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Contact {Id} ({Email}) created", contact.Id, contact.Email);
        return new ContactDto(contact.Id, contact.Name, contact.Email, contact.Company, contact.CreatedAt, 0);
    }
}
