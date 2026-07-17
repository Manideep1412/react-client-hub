using System.ComponentModel.DataAnnotations;

namespace ClientHub.API.Models.DTOs;

public record ContactDto(
    int      Id,
    string   Name,
    string   Email,
    string?  Company,
    DateTime CreatedAt,
    int      ConversationCount
);

public record CreateContactRequest(
    [Required, MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters.")] string Name,
    [Required, EmailAddress, MaxLength(200, ErrorMessage = "Email cannot exceed 200 characters.")] string Email,
    [MaxLength(100, ErrorMessage = "Company cannot exceed 100 characters.")] string? Company
);
