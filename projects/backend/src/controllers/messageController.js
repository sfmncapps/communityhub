import { createClient } from "@supabase/supabase-js";
import { sendNewMessageNotification } from "../utils/notify.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/messages/recipients (Get allowed message targets based on user role & verification status)
export const getRecipients = async (req, res) => {
  try {
    const userId = req.activeUser.id;
    const userRole = (req.activeUser.role || "user").toLowerCase();
    const verificationStatus = req.activeUser.verification_status || "unverified";

    // 1. Fetch available users for direct peer-to-peer messaging
    let userQuery = supabase
      .from("users_active")
      .select("id, name, email, role, company_name, verification_status")
      .neq("id", userId);

    // If regular user (not admin/superadmin), only allow messaging verified users
    if (!["admin", "superadmin"].includes(userRole)) {
      userQuery = userQuery.eq("verification_status", "verified");
    }

    const { data: users, error: userErr } = await userQuery;
    if (userErr) return res.status(500).json({ message: userErr.message });

    // 2. Fetch managed collectives if Collective Manager or Admin
    let managedCollectives = [];
    if (["manager", "admin", "superadmin"].includes(userRole)) {
      const { data: colData } = await supabase
        .from("collectives")
        .select("id, name, slug, owner_id")
        .or(`owner_id.eq.${userId},status.eq.approved`);
      managedCollectives = colData || [];
    }

    return res.json({
      users: users || [],
      collectives: managedCollectives,
      role: userRole,
      verification_status: verificationStatus,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/messages/conversations
export const getConversations = async (req, res) => {
  try {
    const userId = req.activeUser.id;

    // 1. Fetch conversation participant links for current user
    const { data: participantRows, error: partErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id, unread_count, last_read_at")
      .eq("user_id", userId);

    if (partErr) return res.status(500).json({ message: partErr.message });
    if (!participantRows || participantRows.length === 0) {
      return res.json({ conversations: [] });
    }

    const conversationIds = participantRows.map((p) => p.conversation_id);

    // 2. Fetch conversations
    const { data: convs, error: convErr } = await supabase
      .from("conversations")
      .select(`
        *,
        collective:collective_id(id, name, slug, logo_url)
      `)
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (convErr) return res.status(500).json({ message: convErr.message });

    // 3. Fetch all participants for these conversations to display recipient info
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        user:user_id(id, name, email, role, company_name)
      `)
      .in("conversation_id", conversationIds);

    // 4. Fetch latest message snippet for each conversation
    const conversationList = await Promise.all(
      (convs || []).map(async (conv) => {
        const partMeta = participantRows.find((p) => p.conversation_id === conv.id);

        const otherParts = (allParticipants || [])
          .filter((p) => p.conversation_id === conv.id && p.user?.id !== userId)
          .map((p) => p.user);

        const { data: lastMsgArr } = await supabase
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          id: conv.id,
          type: conv.type,
          collective: conv.collective,
          recipients: otherParts,
          unread_count: partMeta?.unread_count || 0,
          last_message: lastMsgArr?.[0] || null,
          updated_at: conv.updated_at,
        };
      })
    );

    return res.json({ conversations: conversationList });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/messages/conversations (Start conversation with User or Collective)
export const createConversation = async (req, res) => {
  try {
    const userId = req.activeUser.id;
    const { recipient_id, collective_id, initial_message } = req.body;

    if (!recipient_id && !collective_id) {
      return res.status(400).json({ message: "Must specify recipient_id or collective_id" });
    }

    const verificationStatus = req.activeUser.verification_status || "unverified";
    if (verificationStatus === "rejected") {
      return res.status(403).json({
        message: "Your ID verification was rejected. Please re-verify your identity before messaging.",
      });
    }

    let existingConvId = null;

    if (collective_id) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("collective_id", collective_id)
        .eq("type", "collective")
        .maybeSingle();

      if (existing) existingConvId = existing.id;
    } else if (recipient_id) {
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (myConvs && myConvs.length > 0) {
        const myConvIds = myConvs.map((c) => c.conversation_id);
        const { data: shared } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", recipient_id)
          .in("conversation_id", myConvIds)
          .maybeSingle();

        if (shared) existingConvId = shared.conversation_id;
      }
    }

    let conversationId = existingConvId;

    if (!conversationId) {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert([
          {
            type: collective_id ? "collective" : "direct",
            collective_id: collective_id || null,
          },
        ])
        .select()
        .single();

      if (convErr) return res.status(500).json({ message: convErr.message });
      conversationId = newConv.id;

      const participantsToInsert = [{ conversation_id: conversationId, user_id: userId }];
      if (recipient_id) {
        participantsToInsert.push({ conversation_id: conversationId, user_id: recipient_id });
      }

      await supabase.from("conversation_participants").insert(participantsToInsert);
    }

    if (initial_message) {
      await sendMessageInConversation(conversationId, userId, initial_message, req.activeUser.name);
    }

    return res.status(201).json({
      message: "Conversation ready",
      conversation_id: conversationId,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/messages/broadcast (Collective Managers broadcast to members; Admins broadcast platform-wide)
export const sendBroadcastMessage = async (req, res) => {
  try {
    const userId = req.activeUser.id;
    const userRole = (req.activeUser.role || "user").toLowerCase();
    const { target_type, collective_id, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Broadcast content cannot be empty" });
    }

    // Role checks
    if (target_type === "platform" && !["admin", "superadmin"].includes(userRole)) {
      return res.status(403).json({ message: "Only platform Admins can send platform-wide announcements" });
    }

    let recipientUsers = [];

    if (target_type === "platform") {
      // Fetch all active users
      const { data: allUsers } = await supabase
        .from("users_active")
        .select("id, email, name")
        .neq("id", userId);
      recipientUsers = allUsers || [];
    } else if (target_type === "collective" && collective_id) {
      // Fetch all members of this collective
      const { data: members } = await supabase
        .from("collective_members")
        .select("user:user_id(id, email, name)")
        .eq("collective_id", collective_id);

      recipientUsers = (members || []).map((m) => m.user).filter((u) => u && u.id !== userId);
    }

    let dispatchedCount = 0;
    for (const recipient of recipientUsers) {
      if (!recipient || !recipient.id) continue;

      // Find or create conversation
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      let convId = null;
      if (myConvs && myConvs.length > 0) {
        const myConvIds = myConvs.map((c) => c.conversation_id);
        const { data: shared } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", recipient.id)
          .in("conversation_id", myConvIds)
          .maybeSingle();

        if (shared) convId = shared.conversation_id;
      }

      if (!convId) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert([{ type: "direct" }])
          .select()
          .single();
        if (newConv) {
          convId = newConv.id;
          await supabase.from("conversation_participants").insert([
            { conversation_id: convId, user_id: userId },
            { conversation_id: convId, user_id: recipient.id },
          ]);
        }
      }

      if (convId) {
        await sendMessageInConversation(convId, userId, content, req.activeUser.name);
        dispatchedCount++;
      }
    }

    return res.json({
      message: `Broadcast message dispatched to ${dispatchedCount} recipient(s). Email copies forwarded.`,
      recipient_count: dispatchedCount,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// GET /api/messages/conversations/:id
export const getMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.activeUser.id;

    await supabase
      .from("conversation_participants")
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id(id, name, email, role)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });

    return res.json({ messages: messages || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// POST /api/messages/conversations/:id
export const postMessage = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.body;
    const senderId = req.activeUser.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const newMessage = await sendMessageInConversation(
      conversationId,
      senderId,
      content,
      req.activeUser.name
    );

    return res.status(201).json({ message: "Message sent", messageItem: newMessage });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// Helper function to handle sending message, updating timestamp, and email mirroring dispatch
async function sendMessageInConversation(conversationId, senderId, content, senderName) {
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
      },
    ])
    .select()
    .single();

  if (msgErr) throw new Error(msgErr.message);

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select(`
      user_id, unread_count,
      user:user_id(email, name)
    `)
    .eq("conversation_id", conversationId);

  for (const part of participants || []) {
    if (part.user_id !== senderId) {
      await supabase
        .from("conversation_participants")
        .update({ unread_count: (part.unread_count || 0) + 1 })
        .eq("conversation_id", conversationId)
        .eq("user_id", part.user_id);

      // Forward email notification copy per RFP requirements
      if (part.user?.email) {
        sendNewMessageNotification(
          part.user.email,
          senderName || "Community Member",
          content
        );
      }
    }
  }

  return msg;
}
