using Xunit;
using ClientHub.API.Models.Entities;
using ClientHub.API.Services;
using ClientHub.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace ClientHub.Tests;

public class MessageServiceTests : IDisposable
{
    private readonly API.Data.AppDbContext _db = DbContextFactory.Create();
    private MessageService Svc() => new(_db, NullLogger<MessageService>.Instance);

    public void Dispose() => _db.Dispose();

    // ── Seed helpers ──────────────────────────────────────────────────────────

    private User SeedUser(string email = "agent@test.com", string name = "Agent User")
    {
        var u = new User
        {
            Email        = email,
            FullName     = name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pw"),
            Role         = "Agent",
        };
        _db.Users.Add(u);
        _db.SaveChanges();
        return u;
    }

    private (Contact contact, Conversation conversation) SeedConversation()
    {
        var contact = new Contact { Name = "Client", Email = "client@test.com" };
        _db.Contacts.Add(contact);
        _db.SaveChanges();

        var conv = new Conversation { ContactId = contact.Id, Subject = "Test" };
        _db.Conversations.Add(conv);
        _db.SaveChanges();

        return (contact, conv);
    }

    private Message SeedMessage(int convId, int senderId, string body, SenderType senderType = SenderType.Agent, bool isRead = true)
    {
        var msg = new Message
        {
            ConversationId = convId,
            SenderId       = senderId,
            SenderType     = senderType,
            Body           = body,
            IsRead         = isRead,
        };
        _db.Messages.Add(msg);
        _db.SaveChanges();
        return msg;
    }

    // ── GetByConversationAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetByConversationAsync_ReturnsMappedDtos()
    {
        var user = SeedUser();
        var (_, conv) = SeedConversation();
        SeedMessage(conv.Id, user.Id, "Hello");
        SeedMessage(conv.Id, user.Id, "World");

        var result = await Svc().GetByConversationAsync(conv.Id);

        result.Should().HaveCount(2);
        result[0].Body.Should().Be("Hello");
        result[1].Body.Should().Be("World");
    }

    [Fact]
    public async Task GetByConversationAsync_ReturnsMessagesInChronologicalOrder()
    {
        var user = SeedUser();
        var (_, conv) = SeedConversation();

        // Insert in reverse order
        var m2 = new Message
        {
            ConversationId = conv.Id, SenderId = user.Id,
            SenderType = SenderType.Agent, Body = "Second",
            CreatedAt = DateTime.UtcNow.AddMinutes(1), IsRead = true,
        };
        var m1 = new Message
        {
            ConversationId = conv.Id, SenderId = user.Id,
            SenderType = SenderType.Agent, Body = "First",
            CreatedAt = DateTime.UtcNow.AddMinutes(-1), IsRead = true,
        };
        _db.Messages.AddRange(m2, m1);
        _db.SaveChanges();

        var result = await Svc().GetByConversationAsync(conv.Id);

        result[0].Body.Should().Be("First");
        result[1].Body.Should().Be("Second");
    }

    [Fact]
    public async Task GetByConversationAsync_ReturnsEmptyList_WhenNoMessages()
    {
        var (_, conv) = SeedConversation();

        var result = await Svc().GetByConversationAsync(conv.Id);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetByConversationAsync_MapsAllDtoFields()
    {
        var user = SeedUser("agent@test.com", "The Agent");
        var (_, conv) = SeedConversation();
        SeedMessage(conv.Id, user.Id, "Hi!", SenderType.Agent, isRead: true);

        var result = await Svc().GetByConversationAsync(conv.Id);

        var dto = result.Single();
        dto.ConversationId.Should().Be(conv.Id);
        dto.SenderId.Should().Be(user.Id);
        dto.SenderName.Should().Be("The Agent");
        dto.SenderType.Should().Be("agent");
        dto.Body.Should().Be("Hi!");
        dto.IsRead.Should().BeTrue();
    }

    [Fact]
    public async Task GetByConversationAsync_PagesResults()
    {
        var user = SeedUser();
        var (_, conv) = SeedConversation();
        for (int i = 0; i < 5; i++)
            SeedMessage(conv.Id, user.Id, $"Msg{i}");

        var result = await Svc().GetByConversationAsync(conv.Id, page: 2, pageSize: 2);

        result.Should().HaveCount(2);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PersistsMessageAndUpdatesLastMessageAt()
    {
        var user = SeedUser();
        var (_, conv) = SeedConversation();

        var result = await Svc().CreateAsync(conv.Id, user.Id, "  Hello world  ");

        result.Body.Should().Be("Hello world");
        result.SenderId.Should().Be(user.Id);
        result.SenderType.Should().Be("agent");
        _db.Conversations.Find(conv.Id)!.LastMessageAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_ThrowsKeyNotFoundException_WhenSenderNotFound()
    {
        var (_, conv) = SeedConversation();

        await FluentActions.Invoking(() => Svc().CreateAsync(conv.Id, senderId: 9999, "Hello"))
            .Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*9999*");
    }

    [Fact]
    public async Task CreateAsync_TrimsBody()
    {
        var user = SeedUser();
        var (_, conv) = SeedConversation();

        var result = await Svc().CreateAsync(conv.Id, user.Id, "   trimmed   ");

        result.Body.Should().Be("trimmed");
    }

    // ── ToDto (static helper) ─────────────────────────────────────────────────

    [Fact]
    public void ToDto_UsesSenderNameFromUserParam_WhenProvided()
    {
        var sender = new User { Id = 1, FullName = "Explicit Sender", Email = "x@test.com", PasswordHash = "", Role = "Agent" };
        var msg    = new Message
        {
            Id = 10, ConversationId = 1, SenderId = 1,
            SenderType = SenderType.Client, Body = "Hi", IsRead = false,
        };

        var dto = MessageService.ToDto(msg, sender);

        dto.SenderName.Should().Be("Explicit Sender");
        dto.SenderType.Should().Be("client");
    }

    [Fact]
    public void ToDto_UsesSenderNameFromNavigationProperty_WhenUserParamIsNull()
    {
        var msg = new Message
        {
            Id = 1, ConversationId = 1, SenderId = 1,
            SenderType = SenderType.Agent, Body = "Nav", IsRead = true,
            Sender = new User { Id = 1, FullName = "Nav Sender", Email = "nav@test.com", PasswordHash = "", Role = "Agent" },
        };

        var dto = MessageService.ToDto(msg);

        dto.SenderName.Should().Be("Nav Sender");
    }
}
