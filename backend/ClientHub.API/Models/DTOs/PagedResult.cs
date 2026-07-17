namespace ClientHub.API.Models.DTOs;

public record PagedResult<T>(
    List<T> Items,
    int     TotalCount,
    int     TotalPages,
    int     Page,
    int     PageSize
);
