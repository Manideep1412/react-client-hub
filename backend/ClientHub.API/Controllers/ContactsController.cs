using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClientHub.API.Controllers;

/// <summary>Contact management — client contact directory with search and pagination.</summary>
[ApiController, Route("api/contacts"), Authorize]
[Produces("application/json")]
public class ContactsController(ContactService svc) : ControllerBase
{
    /// <summary>Return a paginated list of contacts, optionally filtered by a search term.</summary>
    /// <remarks>
    /// Searches across the contact's full name, email, and phone fields (case-insensitive).
    /// Results are sorted alphabetically by full name.
    ///
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="search">Optional free-text search across name, email, and phone.</param>
    /// <param name="page">Page number, 1-based (default: 1).</param>
    /// <param name="pageSize">Number of contacts per page (default: 20).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Paged list of contacts with total count.</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ContactDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<PagedResult<ContactDto>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => svc.GetAllAsync(search, page, pageSize, ct);

    /// <summary>Return a single contact by their numeric ID.</summary>
    /// <remarks>
    /// Returns the full contact profile including all stored fields.
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="id">The numeric contact ID.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Full contact profile.</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    /// <response code="404">No contact found with the given ID.</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ContactDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContactDto>> GetById(int id, CancellationToken ct)
    {
        var c = await svc.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    /// <summary>Create a new contact in the directory.</summary>
    /// <remarks>
    /// Adds a new client contact. All fields except phone are required.
    ///
    /// Example request body:
    /// ```json
    /// {
    ///   "fullName": "Alice Johnson",
    ///   "email": "alice@acme.com",
    ///   "phone": "+1 555-0100",
    ///   "company": "Acme Corp",
    ///   "avatarUrl": "https://example.com/avatar.png"
    /// }
    /// ```
    ///
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="req">New contact details.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="201">Contact created. Location header points to the new resource.</response>
    /// <response code="400">Validation failed (missing required fields).</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ContactDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ContactDto>> Create(
        CreateContactRequest req, CancellationToken ct)
    {
        var c = await svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, c);
    }
}
