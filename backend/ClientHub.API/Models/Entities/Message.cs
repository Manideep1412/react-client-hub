namespace ClientHub.API.Models.Entities;

public enum SenderType { Agent, Client }

public class Message
{
    public int          Id             { get; set; }
    public int          ConversationId { get; set; }
    public Conversation Conversation   { get; set; } = null!;
    public int          SenderId       { get; set; }
    public User         Sender         { get; set; } = null!;
    public SenderType   SenderType     { get; set; } = SenderType.Agent;
    public string       Body           { get; set; } = "";
    public bool         IsRead         { get; set; }
    public DateTime     CreatedAt      { get; set; } = DateTime.UtcNow;
}
