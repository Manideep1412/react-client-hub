namespace ClientHub.API.Middleware;

public class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception: {Method} {Path}", ctx.Request.Method, ctx.Request.Path);

            var (statusCode, message) = ex switch
            {
                KeyNotFoundException      => (StatusCodes.Status404NotFound,            ex.Message),
                InvalidOperationException => (StatusCodes.Status409Conflict,            ex.Message),
                UnauthorizedAccessException => (StatusCodes.Status403Forbidden,         "Access denied."),
                ArgumentException         => (StatusCodes.Status400BadRequest,          ex.Message),
                _                         => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
            };

            ctx.Response.StatusCode  = statusCode;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new { error = message, status = statusCode });
        }
    }
}
