using Xunit;
using ClientHub.API.Controllers;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Models.Entities;
using ClientHub.API.Services;
using ClientHub.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace ClientHub.Tests;

public class AuthControllerTests : IDisposable
{
    private readonly API.Data.AppDbContext _db = DbContextFactory.Create();
    private readonly TokenService _tokens;

    public AuthControllerTests()
    {
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]      = "test-secret-key-that-is-at-least-32-chars!",
                ["Jwt:Issuer"]   = "test",
                ["Jwt:Audience"] = "test",
            })
            .Build();
        _tokens = new TokenService(cfg);
    }

    public void Dispose() => _db.Dispose();

    private AuthController BuildController() =>
        new(_db, _tokens)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };

    private User SeedUser(string email = "agent@test.com", string password = "Agent@123", string role = "Agent")
    {
        var user = new User
        {
            Email        = email,
            FullName     = "Test Agent",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role         = role,
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        return user;
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_Returns200WithToken_WhenCredentialsAreValid()
    {
        SeedUser("agent@test.com", "Agent@123");

        var result = await BuildController().Login(new LoginRequest("agent@test.com", "Agent@123"));

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<AuthResponse>().Subject;
        body.Token.Should().NotBeNullOrWhiteSpace();
        body.User.Email.Should().Be("agent@test.com");
        body.User.Role.Should().Be("Agent");
    }

    [Fact]
    public async Task Login_Returns401_WhenUserDoesNotExist()
    {
        var result = await BuildController().Login(new LoginRequest("nobody@test.com", "pw"));

        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_Returns401_WhenPasswordIsWrong()
    {
        SeedUser("agent@test.com", "correct-password");

        var result = await BuildController().Login(new LoginRequest("agent@test.com", "wrong-password"));

        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_TokenContainsUserDetails()
    {
        SeedUser("agent@test.com", "Agent@123", "Admin");

        var result = await BuildController().Login(new LoginRequest("agent@test.com", "Agent@123"));

        var ok   = (OkObjectResult)result.Result!;
        var auth = (AuthResponse)ok.Value!;
        auth.User.FullName.Should().Be("Test Agent");
        auth.User.Role.Should().Be("Admin");
    }
}
