using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClientHub.API.Controllers;

[ApiController, Route("api/contacts"), Authorize]
public class ContactsController(ContactService svc) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<ContactDto>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => svc.GetAllAsync(search, page, pageSize, ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContactDto>> GetById(int id, CancellationToken ct)
    {
        var c = await svc.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<ActionResult<ContactDto>> Create(
        CreateContactRequest req, CancellationToken ct)
    {
        var c = await svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, c);
    }
}
