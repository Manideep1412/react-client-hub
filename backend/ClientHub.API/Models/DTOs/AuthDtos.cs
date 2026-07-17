namespace ClientHub.API.Models.DTOs;

public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, UserDto User);
public record UserDto(int Id, string Email, string FullName, string Role, bool IsOnline);
