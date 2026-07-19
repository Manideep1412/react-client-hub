using Xunit;
using ClientHub.API.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using System.Text.Json;

namespace ClientHub.Tests;

public class ErrorHandlingMiddlewareTests
{
    private static async Task<(int StatusCode, JsonElement Body)> InvokeWith(Exception ex)
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();

        var middleware = new ErrorHandlingMiddleware(
            _ => throw ex,
            NullLogger<ErrorHandlingMiddleware>.Instance
        );

        await middleware.InvokeAsync(ctx);

        ctx.Response.Body.Seek(0, SeekOrigin.Begin);
        var json = await JsonDocument.ParseAsync(ctx.Response.Body);

        return (ctx.Response.StatusCode, json.RootElement);
    }

    [Fact]
    public async Task InvokeAsync_Returns404_ForKeyNotFoundException()
    {
        var (status, body) = await InvokeWith(new KeyNotFoundException("Resource not found."));

        status.Should().Be(StatusCodes.Status404NotFound);
        body.GetProperty("error").GetString().Should().Be("Resource not found.");
    }

    [Fact]
    public async Task InvokeAsync_Returns409_ForInvalidOperationException()
    {
        var (status, body) = await InvokeWith(new InvalidOperationException("Already exists."));

        status.Should().Be(StatusCodes.Status409Conflict);
        body.GetProperty("error").GetString().Should().Be("Already exists.");
    }

    [Fact]
    public async Task InvokeAsync_Returns403_ForUnauthorizedAccessException()
    {
        var (status, body) = await InvokeWith(new UnauthorizedAccessException("Forbidden."));

        status.Should().Be(StatusCodes.Status403Forbidden);
        body.GetProperty("error").GetString().Should().Be("Access denied.");
    }

    [Fact]
    public async Task InvokeAsync_Returns400_ForArgumentException()
    {
        var (status, body) = await InvokeWith(new ArgumentException("Bad input."));

        status.Should().Be(StatusCodes.Status400BadRequest);
        body.GetProperty("error").GetString().Should().Be("Bad input.");
    }

    [Fact]
    public async Task InvokeAsync_Returns500_ForUnhandledException()
    {
        var (status, body) = await InvokeWith(new Exception("Something went wrong."));

        status.Should().Be(StatusCodes.Status500InternalServerError);
        body.GetProperty("error").GetString().Should().Be("An unexpected error occurred.");
    }

    [Fact]
    public async Task InvokeAsync_SetsContentTypeToJson()
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();

        var mw = new ErrorHandlingMiddleware(
            _ => throw new Exception("err"),
            NullLogger<ErrorHandlingMiddleware>.Instance
        );
        await mw.InvokeAsync(ctx);

        ctx.Response.ContentType.Should().Contain("application/json");
    }

    [Fact]
    public async Task InvokeAsync_IncludesStatusCodeInBody()
    {
        var (status, body) = await InvokeWith(new KeyNotFoundException("not found"));

        body.GetProperty("status").GetInt32().Should().Be(status);
    }

    [Fact]
    public async Task InvokeAsync_CallsNextDelegate_WhenNoException()
    {
        bool nextCalled = false;
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();

        var mw = new ErrorHandlingMiddleware(
            _ => { nextCalled = true; return Task.CompletedTask; },
            NullLogger<ErrorHandlingMiddleware>.Instance
        );

        await mw.InvokeAsync(ctx);

        nextCalled.Should().BeTrue();
        ctx.Response.StatusCode.Should().Be(200);
    }
}
