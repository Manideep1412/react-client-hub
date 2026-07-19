using Xunit;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using ClientHub.API.Services;
using ClientHub.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace ClientHub.Tests;

public class ContactServiceTests : IDisposable
{
    private readonly API.Data.AppDbContext _db = DbContextFactory.Create();
    private ContactService Svc() => new(_db, NullLogger<ContactService>.Instance);

    public void Dispose() => _db.Dispose();

    // ── Seed helpers ──────────────────────────────────────────────────────────

    private Contact SeedContact(string name = "Alice", string email = "alice@test.com", string? company = null)
    {
        var c = new Contact { Name = name, Email = email, Company = company };
        _db.Contacts.Add(c);
        _db.SaveChanges();
        return c;
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllContacts_WhenNoFilter()
    {
        SeedContact("Alice", "alice@test.com");
        SeedContact("Bob",   "bob@test.com");

        var result = await Svc().GetAllAsync(null);

        result.TotalCount.Should().Be(2);
        result.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllAsync_FiltersContactsByName()
    {
        SeedContact("Alice Smith", "alice@test.com");
        SeedContact("Bob Jones",   "bob@test.com");

        var result = await Svc().GetAllAsync("Alice");

        result.Items.Should().ContainSingle(c => c.Name == "Alice Smith");
    }

    [Fact]
    public async Task GetAllAsync_FiltersContactsByEmail()
    {
        SeedContact("Alice", "alice@acme.com");
        SeedContact("Bob",   "bob@corp.com");

        var result = await Svc().GetAllAsync("acme");

        result.Items.Should().ContainSingle(c => c.Email == "alice@acme.com");
    }

    [Fact]
    public async Task GetAllAsync_FiltersContactsByCompany()
    {
        SeedContact("Alice", "alice@test.com", company: "Acme Corp");
        SeedContact("Bob",   "bob@test.com",   company: "Globex");

        var result = await Svc().GetAllAsync("Globex");

        result.Items.Should().ContainSingle(c => c.Name == "Bob");
    }

    [Fact]
    public async Task GetAllAsync_PagesResults()
    {
        for (int i = 1; i <= 5; i++)
            SeedContact($"User{i:D2}", $"user{i}@test.com");

        var result = await Svc().GetAllAsync(null, page: 2, pageSize: 2);

        result.Page.Should().Be(2);
        result.PageSize.Should().Be(2);
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(5);
        result.TotalPages.Should().Be(3);
    }

    [Fact]
    public async Task GetAllAsync_IncludesConversationCount()
    {
        var contact = SeedContact();
        // Conversation entity requires AssignedToId (optional) — just set ContactId
        _db.Conversations.Add(new Conversation { ContactId = contact.Id, Subject = "Test" });
        _db.Conversations.Add(new Conversation { ContactId = contact.Id, Subject = "Test2" });
        _db.SaveChanges();

        var result = await Svc().GetAllAsync(null);

        result.Items.Single().ConversationCount.Should().Be(2);
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ReturnsContact_WhenExists()
    {
        var contact = SeedContact("Charlie", "charlie@test.com", "Corp");

        var result = await Svc().GetByIdAsync(contact.Id);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Charlie");
        result.Email.Should().Be("charlie@test.com");
        result.Company.Should().Be("Corp");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        var result = await Svc().GetByIdAsync(9999);

        result.Should().BeNull();
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PersistsContactAndReturnsDto()
    {
        var req = new CreateContactRequest("Dave", "dave@test.com", "Startup");

        var result = await Svc().CreateAsync(req);

        result.Should().NotBeNull();
        result.Name.Should().Be("Dave");
        result.Email.Should().Be("dave@test.com");
        result.Company.Should().Be("Startup");
        result.ConversationCount.Should().Be(0);
        _db.Contacts.Should().ContainSingle(c => c.Email == "dave@test.com");
    }

    [Fact]
    public async Task CreateAsync_NormalizesEmailToLowerCase()
    {
        var req = new CreateContactRequest("Eve", "EVE@TEST.COM", null);

        var result = await Svc().CreateAsync(req);

        result.Email.Should().Be("eve@test.com");
    }

    [Fact]
    public async Task CreateAsync_TrimsNameAndEmail()
    {
        var req = new CreateContactRequest("  Frank  ", "  frank@test.com  ", null);

        var result = await Svc().CreateAsync(req);

        result.Name.Should().Be("Frank");
        result.Email.Should().Be("frank@test.com");
    }

    [Fact]
    public async Task CreateAsync_ThrowsInvalidOperationException_WhenEmailAlreadyExists()
    {
        SeedContact("Alice", "alice@test.com");
        var req = new CreateContactRequest("Alice2", "alice@test.com", null);

        await FluentActions.Invoking(() => Svc().CreateAsync(req))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*alice@test.com*");
    }
}
