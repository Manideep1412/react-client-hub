using Xunit;
using System.Security.Claims;
using ClientHub.API.Controllers;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using ClientHub.API.Services;
using ClientHub.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace ClientHub.Tests;

public class ConversationsControllerTests : IDisposable
{
    private readonly API.Data.AppDbContext _db = DbContextFactory.Create();

    public void Dispose() => _db.Dispose();

    private ConversationService BuildService() =>
        new(_db, NullLogger<ConversationService>.Instance);

    private ConversationsController BuildController(int agentId = 1)
    {
        var identity  = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, agentId.ToString())]);
        var principal = new ClaimsPrincipal(identity);
        return new ConversationsController(BuildService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal },
            },
        };
    }

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
            FullName     = "Agent",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pw"),
            Role         = "Agent",
        };
        _db.Users.Add(u);
        _db.SaveChanges();
        return u;
    }

    private Conversation SeedConversation(int contactId, string subject = "Test", ConversationStatus status = ConversationStatus.Open)
    {
        var c = new Conversation
        {
            ContactId = contactId, Subject = subject, Status = status, LastMessageAt = DateTime.UtcNow,
        };
        _db.Conversations.Add(c);
        _db.SaveChanges();
        return c;
    }

    // ── GetAll ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsPagedResult()
    {
        var contact = SeedContact();
        SeedConversation(contact.Id, "Sub1");
        SeedConversation(contact.Id, "Sub2");

        var result = await BuildController().GetAll(null, null, 1, 20, default);

        result.TotalCount.Should().Be(2);
        result.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAll_FiltersByStatus()
    {
        var contact = SeedContact();
        SeedConversation(contact.Id, status: ConversationStatus.Open);
        SeedConversation(contact.Id, status: ConversationStatus.Resolved);

        var result = await BuildController().GetAll("open", null, 1, 20, default);

        result.Items.Should().ContainSingle(c => c.Status == "open");
    }

    // ── GetById ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Returns200_WhenFound()
    {
        var contact = SeedContact();
        var conv    = SeedConversation(contact.Id, "My conv");

        var result = await BuildController().GetById(conv.Id, default);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ((ConversationDto)ok.Value!).Subject.Should().Be("My conv");
    }

    [Fact]
    public async Task GetById_Returns404_WhenNotFound()
    {
        var result = await BuildController().GetById(9999, default);

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_Returns201_WithCreatedConversation()
    {
        var contact = SeedContact();
        var agent   = SeedAgent();
        var req     = new CreateConversationRequest(contact.Id, "Support request", "Hello");

        var result = await BuildController(agent.Id).Create(req, default);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var dto     = created.Value.Should().BeOfType<ConversationDto>().Subject;
        dto.Subject.Should().Be("Support request");
        dto.AssignedToId.Should().Be(agent.Id);
    }

    // ── UpdateStatus ──────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_Returns200_WhenValidStatus()
    {
        var contact = SeedContact();
        var conv    = SeedConversation(contact.Id, status: ConversationStatus.Open);

        var result = await BuildController().UpdateStatus(conv.Id, new UpdateStatusRequest("resolved"), default);

        var ok  = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = (ConversationDto)ok.Value!;
        dto.Status.Should().Be("resolved");
    }

    [Fact]
    public async Task UpdateStatus_Returns404_WhenConversationNotFound()
    {
        var result = await BuildController().UpdateStatus(9999, new UpdateStatusRequest("resolved"), default);

        result.Result.Should().BeOfType<NotFoundResult>();
    }
}
