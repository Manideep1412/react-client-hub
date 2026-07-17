using System.Security.Claims;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClientHub.API.Controllers;

[ApiController, Route("api/conversations"), Authorize]
public class ConversationsController(ConversationService svc) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<ConversationDto>> GetAll(
        [FromQuery] string? status,   [FromQuery] string? search,
        [FromQuery] int page = 1,     [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => svc.GetAllAsync(status, search, page, pageSize, ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConversationDto>> GetById(int id, CancellationToken ct)
    {
        var c = await svc.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<ActionResult<ConversationDto>> Create(
        CreateConversationRequest req, CancellationToken ct)
    {
        var agentId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var c = await svc.CreateAsync(req, agentId, ct);
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, c);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ConversationDto>> UpdateStatus(
        int id, UpdateStatusRequest req, CancellationToken ct)
    {
        var c = await svc.UpdateStatusAsync(id, req.Status, ct);
        return c is null ? NotFound() : Ok(c);
    }
}
