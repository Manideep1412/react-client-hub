using System.ComponentModel.DataAnnotations;

namespace ClientHub.API.Models.DTOs;

public record ConversationDto(
    int       Id,
    int       ContactId,
    string    ContactName,
    string    ContactEmail,
    string    Subject,
    string    Status,
    string?   LastMessage,
    DateTime? LastMessageAt,
    int       UnreadCount,
    int?      AssignedToId,
    string?   AssignedToName,
    DateTime  CreatedAt
);

public record CreateConversationRequest(
    [Required] int ContactId,
    [Required, MaxLength(200, ErrorMessage = "Subject cannot exceed 200 characters.")] string Subject,
    [Required, MaxLength(5000, ErrorMessage = "Message cannot exceed 5000 characters.")] string Body
);

public record UpdateStatusRequest(
    [Required, RegularExpression("^(open|pending|resolved|closed)$",
        ErrorMessage = "Status must be one of: open, pending, resolved, closed.")]
    string Status
);
