using System.ComponentModel.DataAnnotations;

namespace ClientHub.API.Models.DTOs;

public record MessageDto(
    int      Id,
    int      ConversationId,
    int      SenderId,
    string   SenderName,
    string   SenderType,
    string   Body,
    DateTime CreatedAt,
    bool     IsRead
);

public record SendMessageRequest(
    [Required] int ConversationId,
    [Required, MaxLength(5000, ErrorMessage = "Message cannot exceed 5000 characters.")] string Body
);
