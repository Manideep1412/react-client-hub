using System.Security.Claims;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClientHub.API.Controllers;

/// <summary>Conversation management — create, list, and update support conversations.</summary>
[ApiController, Route("api/conversations"), Authorize]
[Produces("application/json")]
public class ConversationsController(ConversationService svc) : ControllerBase
{
    /// <summary>Return a paginated list of conversations, optionally filtered by status or search term.</summary>
    /// <remarks>
    /// Conversations represent support threads between an agent and a client contact.
    /// Results include the linked contact and the most recent message preview.
    ///
    /// **Filtering**
    /// - <c>status</c>: <c>open</c>, <c>resolved</c>, or <c>closed</c>. Omit to return all.
    /// - <c>search</c>: free-text match against the contact name and conversation subject.
    ///
    /// Results are sorted by last activity (most recent first).
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="status">Filter by conversation status: open, resolved, or closed.</param>
    /// <param name="search">Free-text search across contact name and conversation subject.</param>
    /// <param name="page">Page number, 1-based (default: 1).</param>
    /// <param name="pageSize">Number of conversations per page (default: 20).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Paged list of conversations with total count.</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ConversationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<PagedResult<ConversationDto>> GetAll(
        [FromQuery] string? status,   [FromQuery] string? search,
        [FromQuery] int page = 1,     [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => svc.GetAllAsync(status, search, page, pageSize, ct);

    /// <summary>Return a single conversation by its numeric ID, including message history.</summary>
    /// <remarks>
    /// Returns the full conversation detail with the linked contact and all messages.
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="id">The numeric conversation ID.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Full conversation with contact and messages.</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    /// <response code="404">No conversation found with the given ID.</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ConversationDto>> GetById(int id, CancellationToken ct)
    {
        var c = await svc.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    /// <summary>Open a new conversation with a contact and assign it to the current agent.</summary>
    /// <remarks>
    /// Creates a new support conversation. The authenticated agent is automatically set
    /// as the assigned agent. Initial status is <c>open</c>.
    ///
    /// Example request body:
    /// ```json
    /// {
    ///   "contactId": 3,
    ///   "subject": "Issue with invoice #4521"
    /// }
    /// ```
    ///
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="req">Conversation details — contact ID and subject.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="201">Conversation created. Location header points to the new resource.</response>
    /// <response code="400">Validation failed (missing contactId or subject).</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ConversationDto>> Create(
        CreateConversationRequest req, CancellationToken ct)
    {
        var agentId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var c = await svc.CreateAsync(req, agentId, ct);
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, c);
    }

    /// <summary>Update the status of an existing conversation.</summary>
    /// <remarks>
    /// Transitions a conversation between statuses.
    ///
    /// **Valid status values:** <c>open</c>, <c>pending</c>, <c>resolved</c>, <c>closed</c>
    ///
    /// - <c>open</c> → conversation is active and awaiting a reply.
    /// - <c>pending</c> → waiting on the client; agent has responded.
    /// - <c>resolved</c> → issue addressed; can be reopened if the client replies.
    /// - <c>closed</c> → permanently closed; no further messages expected.
    ///
    /// Example request body:
    /// ```json
    /// { "status": "resolved" }
    /// ```
    ///
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="id">The numeric conversation ID to update.</param>
    /// <param name="req">New status value.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Updated conversation with the new status.</response>
    /// <response code="400">Invalid status value.</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    /// <response code="404">No conversation found with the given ID.</response>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ConversationDto>> UpdateStatus(
        int id, UpdateStatusRequest req, CancellationToken ct)
    {
        var c = await svc.UpdateStatusAsync(id, req.Status, ct);
        return c is null ? NotFound() : Ok(c);
    }
}
