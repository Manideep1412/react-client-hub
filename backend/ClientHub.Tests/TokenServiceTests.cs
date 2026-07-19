using Xunit;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClientHub.API.Models.Entities;
using ClientHub.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace ClientHub.Tests;

public class TokenServiceTests
{
    private static TokenService BuildService(string key = "super-secret-key-that-is-at-least-32-chars!!")
    {
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]      = key,
                ["Jwt:Issuer"]   = "clienthub-test",
                ["Jwt:Audience"] = "clienthub-users",
            })
            .Build();
        return new TokenService(cfg);
    }

    private static User MakeUser(int id = 1, string email = "agent@test.com", string name = "Agent", string role = "Agent")
        => new() { Id = id, Email = email, FullName = name, Role = role, PasswordHash = "" };

    // ── Token generation ──────────────────────────────────────────────────────

    [Fact]
    public void Generate_ReturnsNonEmptyToken()
    {
        var token = BuildService().Generate(MakeUser());

        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Generate_ProducesValidJwt()
    {
        var token = BuildService().Generate(MakeUser());
        var handler = new JwtSecurityTokenHandler();

        handler.CanReadToken(token).Should().BeTrue();
        var jwt = handler.ReadJwtToken(token);
        jwt.Should().NotBeNull();
    }

    [Fact]
    public void Generate_EmbedsClaims_NameIdentifierEmailNameRole()
    {
        var user  = MakeUser(id: 42, email: "agent@test.com", name: "Test Agent", role: "Admin");
        var token = BuildService().Generate(user);
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value.Should().Be("42");
        jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value.Should().Be("agent@test.com");
        jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value.Should().Be("Test Agent");
        jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be("Admin");
    }

    [Fact]
    public void Generate_SetsIssuerAndAudience()
    {
        var token = BuildService().Generate(MakeUser());
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Issuer.Should().Be("clienthub-test");
        jwt.Audiences.Should().Contain("clienthub-users");
    }

    [Fact]
    public void Generate_TokenExpiresInApproximately12Hours()
    {
        var before = DateTime.UtcNow;
        var token  = BuildService().Generate(MakeUser());
        var after  = DateTime.UtcNow;
        var jwt    = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.ValidTo.Should().BeAfter(before.AddHours(11).AddMinutes(59));
        jwt.ValidTo.Should().BeBefore(after.AddHours(12).AddMinutes(1));
    }

    [Fact]
    public void Generate_ProducesUniqueTokensForDifferentUsers()
    {
        var svc   = BuildService();
        var tok1  = svc.Generate(MakeUser(id: 1, email: "a@test.com"));
        var tok2  = svc.Generate(MakeUser(id: 2, email: "b@test.com"));

        tok1.Should().NotBe(tok2);
    }
}
