using System.Security.Claims;
using ClientHub.API.Models.DTOs;
using ClientHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClientHub.API.Controllers;

/// <summary>Message management — read and send messages within a conversation.</summary>
[ApiController, Authorize]
[Produces("application/json")]
public class MessagesController(MessageService msgSvc) : ControllerBase
{
    /// <summary>Return the paginated message history for a conversation.</summary>
    /// <remarks>
    /// Messages are returned in chronological order (oldest first), paginated from the start.
    /// Use <c>page</c> and <c>pageSize</c> to walk through the history.
    ///
    /// A <c>pageSize</c> of 50 is recommended for the initial load; earlier history can be
    /// fetched by incrementing <c>page</c>.
    ///
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="conversationId">The numeric ID of the conversation to fetch messages for.</param>
    /// <param name="page">Page number, 1-based (default: 1).</param>
    /// <param name="pageSize">Number of messages per page (default: 50).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Ordered list of messages for the conversation.</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    [HttpGet("api/conversations/{conversationId:int}/messages")]
    [ProducesResponseType(typeof(List<MessageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<List<MessageDto>> GetMessages(
        int conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
        => msgSvc.GetByConversationAsync(conversationId, page, pageSize, ct);

    /// <summary>Send a new message in a conversation.</summary>
    /// <remarks>
    /// Posts a message from the authenticated agent into the specified conversation.
    /// The sender is derived from the JWT token — it cannot be overridden in the request body.
    ///
    /// After a message is sent, real-time clients receive it via SignalR on the
    /// <c>ReceiveMessage</c> event of the <c>ChatHub</c>.
    ///
    /// Example request body:
    /// ```json
    /// {
    ///   "conversationId": 7,
    ///   "body": "Hi Alice, I can see the issue on your account. Let me look into this."
    /// }
    /// ```
    ///
    /// Requires a valid Bearer token.
    /// </remarks>
    /// <param name="req">Conversation ID and message body.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">The newly created message with timestamp and sender info.</response>
    /// <response code="400">Validation failed (empty body or invalid conversationId).</response>
    /// <response code="401">Missing or invalid Bearer token.</response>
    [HttpPost("api/messages")]
    [ProducesResponseType(typeof(MessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MessageDto>> Send(
        SendMessageRequest req, CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await msgSvc.CreateAsync(req.ConversationId, userId, req.Body, ct));
    }
}
