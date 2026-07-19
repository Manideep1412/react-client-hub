using Xunit;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using ClientHub.API.Services;
using ClientHub.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace ClientHub.Tests;

public class ConversationServiceTests : IDisposable
{
    private readonly API.Data.AppDbContext _db = DbContextFactory.Create();
    private ConversationService Svc() => new(_db, NullLogger<ConversationService>.Instance);

    public void Dispose() => _db.Dispose();

    // ── Seed helpers ──────────────────────────────────────────────────────────

    private Contact SeedContact(string name = "Alice", string email = "alice@test.com")
    {
        var c = new Contact { Name = name, Email = email };
        _db.Contacts.Add(c);
        _db.SaveChanges();
        return c;
    }

    private User SeedAgent(string email = "agent@test.com")
    {
        var u = new User
        {
            Email        = email,
            FullName     = "Agent User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pw"),
            Role         = "Agent",
        };
        _db.Users.Add(u);
        _db.SaveChanges();
        return u;
    }

    private Conversation SeedConversation(int contactId, string subject = "Help", ConversationStatus status = ConversationStatus.Open, int? agentId = null)
    {
        var conv = new Conversation
        {
            ContactId    = contactId,
            Subject      = subject,
            Status       = status,
            AssignedToId = agentId,
            LastMessageAt = DateTime.UtcNow,
        };
        _db.Conversations.Add(conv);
        _db.SaveChanges();
        return conv;
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllConversations_WhenNoFilter()
    {
        var contact = SeedContact();
        SeedConversation(contact.Id, "Sub1");
        SeedConversation(contact.Id, "Sub2");

        var result = await Svc().GetAllAsync(null, null);

        result.TotalCount.Should().Be(2);
        result.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllAsync_FiltersByStatus()
    {
        var contact = SeedContact();
        SeedConversation(contact.Id, status: ConversationStatus.Open);
        SeedConversation(contact.Id, status: ConversationStatus.Resolved);

        var result = await Svc().GetAllAsync("resolved", null);

        result.Items.Should().ContainSingle(c => c.Status == "resolved");
    }

    [Fact]
    public async Task GetAllAsync_FiltersBySubjectSearch()
    {
        var contact = SeedContact();
        SeedConversation(contact.Id, "Invoice issue");
        SeedConversation(contact.Id, "Password reset");

        var result = await Svc().GetAllAsync(null, "Invoice");

        result.Items.Should().ContainSingle(c => c.Subject == "Invoice issue");
    }

    [Fact]
    public async Task GetAllAsync_FiltersByContactName()
    {
        var alice = SeedContact("Alice", "alice@test.com");
        var bob   = SeedContact("Bob",   "bob@test.com");
        SeedConversation(alice.Id, "Alices issue");
        SeedConversation(bob.Id,   "Bobs issue");

        var result = await Svc().GetAllAsync(null, "Alice");

        result.Items.Should().ContainSingle(c => c.ContactName == "Alice");
    }

    [Fact]
    public async Task GetAllAsync_PagesResults()
    {
        var contact = SeedContact();
        for (int i = 0; i < 5; i++)
            SeedConversation(contact.Id, $"Sub{i}");

        var result = await Svc().GetAllAsync(null, null, page: 2, pageSize: 2);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(5);
        result.TotalPages.Should().Be(3);
    }

    [Fact]
    public async Task GetAllAsync_IgnoresUnknownStatus()
    {
        var contact = SeedContact();
        SeedConversation(contact.Id, status: ConversationStatus.Open);

        var result = await Svc().GetAllAsync("garbage_status", null);

        // Invalid status → no status filter → returns all
        result.TotalCount.Should().Be(1);
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ReturnsConversation_WhenExists()
    {
        var contact = SeedContact("Charlie", "charlie@test.com");
        var conv    = SeedConversation(contact.Id, "My subject");

        var result = await Svc().GetByIdAsync(conv.Id);

        result.Should().NotBeNull();
        result!.Subject.Should().Be("My subject");
        result.ContactName.Should().Be("Charlie");
        result.ContactEmail.Should().Be("charlie@test.com");
        result.Status.Should().Be("open");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        var result = await Svc().GetByIdAsync(9999);

        result.Should().BeNull();
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PersistsConversationAndFirstMessage()
    {
        var contact = SeedContact();
        var agent   = SeedAgent();
        var req     = new CreateConversationRequest(contact.Id, "Need help", "Hi there");

        var result = await Svc().CreateAsync(req, agent.Id);

        result.Should().NotBeNull();
        result.Subject.Should().Be("Need help");
        result.AssignedToId.Should().Be(agent.Id);
        _db.Conversations.Should().ContainSingle(c => c.Subject == "Need help");
        _db.Messages.Should().ContainSingle(m => m.Body == "Hi there");
    }

    // ── UpdateStatusAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_UpdatesStatus_WhenValidStatus()
    {
        var contact = SeedContact();
        var conv    = SeedConversation(contact.Id, status: ConversationStatus.Open);

        var result = await Svc().UpdateStatusAsync(conv.Id, "resolved");

        result.Should().NotBeNull();
        result!.Status.Should().Be("resolved");
        _db.Conversations.Find(conv.Id)!.Status.Should().Be(ConversationStatus.Resolved);
    }

    [Fact]
    public async Task UpdateStatusAsync_ReturnsNull_WhenConversationNotFound()
    {
        var result = await Svc().UpdateStatusAsync(9999, "resolved");

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateStatusAsync_ReturnsNull_WhenStatusIsInvalid()
    {
        var contact = SeedContact();
        var conv    = SeedConversation(contact.Id);

        var result = await Svc().UpdateStatusAsync(conv.Id, "not_a_status");

        result.Should().BeNull();
    }
}
