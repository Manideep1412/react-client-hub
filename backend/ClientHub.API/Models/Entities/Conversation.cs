namespace ClientHub.API.Models.Entities;

public enum ConversationStatus { Open, Pending, Resolved, Closed }

public class Conversation
{
    public int                Id            { get; set; }
    public int                ContactId     { get; set; }
    public Contact            Contact       { get; set; } = null!;
    public string             Subject       { get; set; } = "";
    public ConversationStatus Status        { get; set; } = ConversationStatus.Open;
    public int?               AssignedToId  { get; set; }
    public User?              AssignedTo    { get; set; }
    public DateTime           CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime?          LastMessageAt { get; set; }

    public ICollection<Message> Messages { get; set; } = [];
}
