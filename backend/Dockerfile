FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ClientHub.API/ClientHub.API.csproj ClientHub.API/
RUN dotnet restore ClientHub.API/ClientHub.API.csproj
COPY . .
RUN dotnet publish ClientHub.API/ClientHub.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ClientHub.API.dll"]
