using ClientHub.API.Data;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClientHub.API.Controllers;

/// <summary>Authentication — login and JWT token issuance.</summary>
[ApiController, Route("api/auth")]
[Produces("application/json")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    /// <summary>Authenticate with email and password and receive a JWT token.</summary>
    /// <remarks>
    /// Returns a signed Bearer token for use in all subsequent protected requests.
    /// Pass the token in the <c>Authorization: Bearer {token}</c> header.
    ///
    /// **Demo credentials**
    ///
    /// | Role   | Email                    | Password   |
    /// |--------|--------------------------|------------|
    /// | Agent  | agent@clienthub.dev      | Agent@123  |
    /// | Agent  | sarah@clienthub.dev      | Agent@123  |
    ///
    /// Example request body:
    /// ```json
    /// {
    ///   "email": "agent@clienthub.dev",
    ///   "password": "Agent@123"
    /// }
    /// ```
    /// </remarks>
    /// <param name="req">User credentials (email + password).</param>
    /// <response code="200">JWT Bearer token and authenticated user profile.</response>
    /// <response code="401">Invalid email or password.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(new AuthResponse(tokens.Generate(user), new UserDto(user.Id, user.Email, user.FullName, user.Role, user.IsOnline)));
    }
}
