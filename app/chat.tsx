/**
 * Chat Screen — Real-time group chat for Social Circles and Challenges
 *
 * Features: message list, text input, reactions, reply, system messages,
 * typing indicators, read receipts, message search with highlighting,
 * media sharing (photos), and golden-themed UI.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet, Alert, ImageBackground, ActivityIndicator, Modal,
  Image, Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMessages, sendMessage, sendSystemMessage, addReaction, deleteMessage,
  getOrCreateRoom, seedChatRoom, markRoomAsRead, getChatUser,
  markMessagesAsRead, getReadReceiptSummary, simulateReadReceipts,
  setTyping, getTypingUsers, formatTypingText, simulateTyping,
  QUICK_REACTIONS, type ChatMessage, type ChatRoom, type ReadReceipt,
} from "@/lib/chat-service";
import { GOLDEN_SOCIAL, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId: string; roomName: string; roomType: string }>();
  const roomId = params.roomId ?? "default_circle";
  const roomName = params.roomName ?? "Group Chat";
  const roomType = (params.roomType ?? "circle") as "circle" | "challenge";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("local_user");
  const [typingText, setTypingText] = useState("");
  const [readReceiptTooltip, setReadReceiptTooltip] = useState<{ messageId: string; names: string[] } | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages
      .map((m, idx) => ({ message: m, index: idx }))
      .filter((item) => item.message.text.toLowerCase().includes(q) && item.message.type !== "system" && !item.message.deleted);
  }, [messages, searchQuery]);

  const activeMatchId = searchMatches.length > 0 ? searchMatches[searchMatchIndex]?.message.id : null;

  const handleSearchNext = useCallback(() => {
    if (searchMatches.length === 0) return;
    const next = (searchMatchIndex + 1) % searchMatches.length;
    setSearchMatchIndex(next);
    flatListRef.current?.scrollToIndex({ index: searchMatches[next].index, animated: true, viewPosition: 0.5 });
  }, [searchMatchIndex, searchMatches]);

  const handleSearchPrev = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prev = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prev);
    flatListRef.current?.scrollToIndex({ index: searchMatches[prev].index, animated: true, viewPosition: 0.5 });
  }, [searchMatchIndex, searchMatches]);

  const handleSearchOpen = useCallback(() => {
    setSearchOpen(true);
    setSearchQuery("");
    setSearchMatchIndex(0);
  }, []);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
  }, []);

  // ── Media viewer state ────────────────────────────────────────────────────
  const [mediaViewerUrl, setMediaViewerUrl] = useState<string | null>(null);

  // ── Initialize ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      await seedChatRoom(roomId, roomName, roomType);
      const user = await getChatUser();
      setCurrentUserId(user.id);
      const msgs = await getMessages(roomId, 100);
      setMessages(msgs);
      await markMessagesAsRead(roomId);
      setLoading(false);
    })();
  }, [roomId]);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const msgs = await getMessages(roomId, 100);
      setMessages((prev) => {
        const prevJson = JSON.stringify(prev.map((m) => ({ id: m.id, rb: m.readBy?.length ?? 0 })));
        const newJson = JSON.stringify(msgs.map((m) => ({ id: m.id, rb: m.readBy?.length ?? 0 })));
        if (prevJson !== newJson) return msgs;
        return prev;
      });
      simulateTyping(roomId);
      const typers = getTypingUsers(roomId, currentUserId);
      setTypingText(formatTypingText(typers));
      await simulateReadReceipts(roomId);
      await markMessagesAsRead(roomId);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId, currentUserId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 && !searchOpen) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, searchOpen]);

  // Scroll to first match when search query changes
  useEffect(() => {
    if (searchMatches.length > 0) {
      setSearchMatchIndex(0);
      flatListRef.current?.scrollToIndex({ index: searchMatches[0].index, animated: true, viewPosition: 0.5 });
    }
  }, [searchQuery]);

  // ── Typing broadcast ──────────────────────────────────────────────────────
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    setTyping(roomId, currentUserId, "You", text.length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (text.length > 0) {
      typingTimerRef.current = setTimeout(() => {
        setTyping(roomId, currentUserId, "You", false);
      }, 4000);
    }
  }, [roomId, currentUserId]);

  // ── Send text message ─────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setTyping(roomId, currentUserId, "You", false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const msg = await sendMessage(roomId, text, "text", { replyToId: replyTo?.id });
      setMessages((prev) => [...prev, msg]);
      setInputText("");
      setReplyTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert("Error", "Failed to send message");
    }
    setSending(false);
  }, [inputText, sending, roomId, replyTo, currentUserId]);

  // ── Send image message ────────────────────────────────────────────────────
  const handleSendImage = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Show picker options
    Alert.alert("Share Photo", "Choose what to share", [
      {
        text: "Progress Photo",
        onPress: async () => {
          const url = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop";
          const msg = await sendMessage(roomId, "📸 Shared a progress photo", "image", { imageUrl: url });
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        },
      },
      {
        text: "Workout Screenshot",
        onPress: async () => {
          const url = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop";
          const msg = await sendMessage(roomId, "🏋️ Shared a workout screenshot", "image", { imageUrl: url });
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        },
      },
      {
        text: "Meal Photo",
        onPress: async () => {
          const url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop";
          const msg = await sendMessage(roomId, "🥗 Shared a meal photo", "image", { imageUrl: url });
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [roomId]);

  // ── Reactions & Delete ────────────────────────────────────────────────────
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addReaction(roomId, messageId, emoji);
    const msgs = await getMessages(roomId, 100);
    setMessages(msgs);
    setSelectedMessage(null);
  }, [roomId]);

  const handleDelete = useCallback(async (messageId: string) => {
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await deleteMessage(roomId, messageId);
          const msgs = await getMessages(roomId, 100);
          setMessages(msgs);
          setSelectedMessage(null);
        },
      },
    ]);
  }, [roomId]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return time;
    if (diffDays === 1) return `Yesterday ${time}`;
    if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  // ── Highlight search text ─────────────────────────────────────────────────
  const renderHighlightedText = useCallback((text: string, messageId: string) => {
    if (!searchQuery.trim()) {
      return <Text style={styles.msgText}>{text}</Text>;
    }
    const q = searchQuery.toLowerCase();
    const parts: { text: string; highlight: boolean }[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      const idx = remaining.toLowerCase().indexOf(q);
      if (idx === -1) {
        parts.push({ text: remaining, highlight: false });
        break;
      }
      if (idx > 0) parts.push({ text: remaining.slice(0, idx), highlight: false });
      parts.push({ text: remaining.slice(idx, idx + q.length), highlight: true });
      remaining = remaining.slice(idx + q.length);
    }
    const isActiveMatch = messageId === activeMatchId;
    return (
      <Text style={styles.msgText}>
        {parts.map((part, i) =>
          part.highlight ? (
            <Text
              key={i}
              style={{
                backgroundColor: isActiveMatch ? SF.searchActive : SF.searchHighlight,
                borderRadius: 2,
                color: "#000",
                fontWeight: "700",
              }}
            >
              {part.text}
            </Text>
          ) : (
            <Text key={i}>{part.text}</Text>
          ),
        )}
      </Text>
    );
  }, [searchQuery, activeMatchId]);

  // ── Render message ────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === currentUserId;
    const isSystem = item.type === "system";
    const isSelected = selectedMessage === item.id;
    const isImage = item.type === "image" && item.imageUrl;
    const isSearchMatch = searchMatches.some((m) => m.message.id === item.id);

    if (isSystem) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    const replyMsg = item.replyToId ? messages.find((m) => m.id === item.replyToId) : null;

    return (
      <View style={[
        styles.msgRow,
        isMe && styles.msgRowMe,
        isSearchMatch && searchQuery.trim() ? { backgroundColor: "rgba(245,158,11,0.05)", borderRadius: 12, marginHorizontal: -4, paddingHorizontal: 4 } : undefined,
      ]}>
        {!isMe && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.senderAvatar}</Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedMessage(isSelected ? null : item.id);
          }}
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
        >
          {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
          {replyMsg && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyPreviewName}>{replyMsg.senderName}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>{replyMsg.text}</Text>
            </View>
          )}
          {/* Image message */}
          {isImage && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setMediaViewerUrl(item.imageUrl!)}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.chatImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <MaterialIcons name="fullscreen" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
          {item.deleted ? (
            <Text style={[styles.msgText, { fontStyle: "italic", opacity: 0.5 }]}>{item.text}</Text>
          ) : (
            renderHighlightedText(item.text, item.id)
          )}
          <View style={styles.msgMeta}>
            <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
            {item.editedAt && <Text style={styles.editedTag}>edited</Text>}
            {isImage && <MaterialIcons name="photo" size={10} color="rgba(180,83,9,0.5)" />}
            {isMe && !item.deleted && (() => {
              const receipt = getReadReceiptSummary(item, currentUserId);
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (receipt.readByNames.length > 0) {
                      setReadReceiptTooltip(
                        readReceiptTooltip?.messageId === item.id
                          ? null
                          : { messageId: item.id, names: receipt.readByNames }
                      );
                    }
                  }}
                  style={styles.readReceiptBtn}
                >
                  {receipt.isRead ? (
                    <View style={styles.readReceiptRow}>
                      <MaterialIcons name="done-all" size={14} color={SF.gold} />
                      {receipt.readCount > 0 && (
                        <Text style={styles.readCountText}>{receipt.readCount}</Text>
                      )}
                    </View>
                  ) : receipt.isDelivered ? (
                    <MaterialIcons name="done-all" size={14} color="rgba(180,83,9,0.4)" />
                  ) : (
                    <MaterialIcons name="done" size={14} color="rgba(180,83,9,0.3)" />
                  )}
                </TouchableOpacity>
              );
            })()}
          </View>
          {/* Read receipt tooltip */}
          {isMe && readReceiptTooltip?.messageId === item.id && (
            <View style={styles.readReceiptTooltip}>
              <Text style={styles.readReceiptTooltipTitle}>Seen by</Text>
              {readReceiptTooltip.names.map((name, i) => (
                <Text key={i} style={styles.readReceiptTooltipName}>{name}</Text>
              ))}
            </View>
          )}

          {/* Reactions */}
          {Object.keys(item.reactions).length > 0 && (
            <View style={styles.reactionsRow}>
              {Object.entries(item.reactions).map(([emoji, userIds]) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBadge, userIds.includes(currentUserId) && styles.reactionBadgeMine]}
                  onPress={() => handleReaction(item.id, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji} {userIds.length}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Quick action menu */}
        {isSelected && !item.deleted && (
          <View style={[styles.actionMenu, isMe && styles.actionMenuMe]}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setReplyTo(item); setSelectedMessage(null); }}>
              <MaterialIcons name="reply" size={18} color={SF.gold} />
            </TouchableOpacity>
            {QUICK_REACTIONS.slice(0, 5).map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.actionBtn} onPress={() => handleReaction(item.id, emoji)}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            {isMe && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <MaterialIcons name="delete" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [currentUserId, selectedMessage, messages, handleReaction, handleDelete, searchQuery, searchMatches, activeMatchId, readReceiptTooltip, renderHighlightedText]);

  return (
    <ImageBackground source={{ uri: GOLDEN_SOCIAL }} style={{ flex: 1 }} resizeMode="cover">
      <ScreenContainer edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Header */}
          {searchOpen ? (
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={handleSearchClose} style={styles.backBtn}>
                <MaterialIcons name="close" size={22} color={SF.fg} />
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Search messages..."
                placeholderTextColor="rgba(180,83,9,0.5)"
                value={searchQuery}
                onChangeText={(t) => { setSearchQuery(t); setSearchMatchIndex(0); }}
                autoFocus
                returnKeyType="search"
              />
              {searchMatches.length > 0 && (
                <View style={styles.searchNav}>
                  <Text style={styles.searchCount}>
                    {searchMatchIndex + 1}/{searchMatches.length}
                  </Text>
                  <TouchableOpacity onPress={handleSearchPrev} style={styles.searchNavBtn}>
                    <MaterialIcons name="keyboard-arrow-up" size={22} color={SF.gold} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSearchNext} style={styles.searchNavBtn}>
                    <MaterialIcons name="keyboard-arrow-down" size={22} color={SF.gold} />
                  </TouchableOpacity>
                </View>
              )}
              {searchQuery.trim() && searchMatches.length === 0 && (
                <Text style={styles.searchNoResults}>No results</Text>
              )}
            </View>
          ) : (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={22} color={SF.fg} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>{roomName}</Text>
                <Text style={styles.headerSub}>
                  {roomType === "circle" ? "Circle Chat" : "Challenge Chat"} · {messages.length} messages
                </Text>
              </View>
              <TouchableOpacity style={styles.headerAction} onPress={handleSearchOpen}>
                <MaterialIcons name="search" size={22} color={SF.gold} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerAction}>
                <MaterialIcons name="people" size={22} color={SF.gold} />
              </TouchableOpacity>
            </View>
          )}

          {/* Messages */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={SF.gold} />
              <Text style={{ color: SF.muted, marginTop: 12, fontSize: 13 }}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (!searchOpen) flatListRef.current?.scrollToEnd({ animated: false });
              }}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                }, 200);
              }}
              ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 }}>
                  <Text style={{ fontSize: 40 }}>💬</Text>
                  <Text style={{ color: SF.fg, fontSize: 16, fontWeight: "700", marginTop: 12 }}>No messages yet</Text>
                  <Text style={{ color: SF.muted, fontSize: 13, marginTop: 4 }}>Be the first to say something!</Text>
                </View>
              }
            />
          )}

          {/* Typing indicator */}
          {typingText.length > 0 && (
            <View style={styles.typingBar}>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { opacity: 0.4 }]} />
                <View style={[styles.typingDot, { opacity: 0.7 }]} />
                <View style={[styles.typingDot, { opacity: 1.0 }]} />
              </View>
              <Text style={styles.typingText}>{typingText}</Text>
            </View>
          )}

          {/* Reply preview */}
          {replyTo && (
            <View style={styles.replyBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.replyBarName}>Replying to {replyTo.senderName}</Text>
                <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.text}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <MaterialIcons name="close" size={20} color={SF.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity style={styles.attachBtn} onPress={handleSendImage}>
              <MaterialIcons name="photo-camera" size={22} color={SF.gold} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="rgba(180,83,9,0.5)"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <MaterialIcons name="send" size={20} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>

      {/* Full-screen image viewer modal */}
      <Modal visible={!!mediaViewerUrl} transparent animationType="fade" onRequestClose={() => setMediaViewerUrl(null)}>
        <View style={styles.mediaViewerBg}>
          <TouchableOpacity style={styles.mediaViewerClose} onPress={() => setMediaViewerUrl(null)}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {mediaViewerUrl && (
            <Image
              source={{ uri: mediaViewerUrl }}
              style={styles.mediaViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, gap: 12, backgroundColor: "rgba(10,14,20,0.85)",
    borderBottomWidth: 1, borderBottomColor: SF.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: SF.fg, fontSize: 17, fontWeight: "700" },
  headerSub: { color: SF.muted, fontSize: 11, marginTop: 1 },
  headerAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
  },
  // Search header
  searchHeader: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12,
    paddingVertical: 8, gap: 8, backgroundColor: "rgba(10,14,20,0.92)",
    borderBottomWidth: 1, borderBottomColor: SF.border,
  },
  searchInput: {
    flex: 1, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, color: SF.fg, fontSize: 14,
    borderWidth: 1, borderColor: SF.border,
  },
  searchNav: {
    flexDirection: "row", alignItems: "center", gap: 2,
  },
  searchNavBtn: {
    width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
  },
  searchCount: {
    color: SF.gold, fontSize: 11, fontWeight: "700", minWidth: 30, textAlign: "center",
  },
  searchNoResults: {
    color: SF.muted, fontSize: 12, fontStyle: "italic",
  },
  // Messages
  systemMsg: {
    alignSelf: "center", backgroundColor: SF.systemBg,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginVertical: 8, maxWidth: "85%",
  },
  systemMsgText: { color: SF.gold3, fontSize: 12, textAlign: "center", lineHeight: 17 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 3, gap: 8 },
  msgRowMe: { flexDirection: "row-reverse" },
  avatarCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 14 },
  bubble: {
    maxWidth: "75%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: SF.myBubble, borderBottomRightRadius: 4,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.20)",
  },
  bubbleOther: {
    backgroundColor: SF.otherBubble, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: SF.border,
  },
  senderName: { color: SF.gold2, fontSize: 12, fontWeight: "700", marginBottom: 3 },
  msgText: { color: SF.fg, fontSize: 14, lineHeight: 20 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  msgTime: { color: "rgba(180,83,9,0.6)", fontSize: 10 },
  editedTag: { color: "rgba(180,83,9,0.4)", fontSize: 9, fontStyle: "italic" },
  // Image messages
  imageContainer: {
    borderRadius: 12, overflow: "hidden", marginBottom: 6, position: "relative",
  },
  chatImage: {
    width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.55, borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12, width: 28, height: 28, alignItems: "center", justifyContent: "center",
  },
  // Reactions
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  reactionBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  reactionBadgeMine: { borderColor: SF.gold, backgroundColor: "rgba(245,158,11,0.15)" },
  reactionEmoji: { fontSize: 12, color: SF.fg },
  // Reply
  replyPreview: {
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: SF.gold,
  },
  replyPreviewName: { color: SF.gold2, fontSize: 11, fontWeight: "700" },
  replyPreviewText: { color: SF.muted, fontSize: 12, marginTop: 1 },
  replyBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "rgba(10,14,20,0.90)", borderTopWidth: 1, borderTopColor: SF.border,
    gap: 12,
  },
  replyBarName: { color: SF.gold, fontSize: 12, fontWeight: "700" },
  replyBarText: { color: SF.muted, fontSize: 12, marginTop: 1 },
  // Action menu
  actionMenu: {
    flexDirection: "row", gap: 4, position: "absolute", bottom: -30,
    left: 40, backgroundColor: "rgba(10,14,20,0.95)", borderRadius: 20,
    paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderColor: SF.border,
    zIndex: 10,
  },
  actionMenuMe: { left: undefined, right: 0 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  // Input
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: "rgba(10,14,20,0.90)", borderTopWidth: 1, borderTopColor: SF.border,
    gap: 8,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, color: SF.fg, fontSize: 14,
    maxHeight: 100, borderWidth: 1, borderColor: SF.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: SF.gold,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  // Read receipts
  readReceiptBtn: {
    flexDirection: "row", alignItems: "center", marginLeft: 2,
  },
  readReceiptRow: {
    flexDirection: "row", alignItems: "center", gap: 2,
  },
  readCountText: {
    color: SF.gold, fontSize: 9, fontWeight: "700",
  },
  readReceiptTooltip: {
    backgroundColor: "rgba(10,14,20,0.95)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
    borderWidth: 1, borderColor: SF.border,
  },
  readReceiptTooltipTitle: {
    color: SF.gold, fontSize: 11, fontWeight: "700", marginBottom: 4,
  },
  readReceiptTooltipName: {
    color: SF.fg, fontSize: 12, lineHeight: 18,
  },
  // Typing indicator
  typingBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 6, gap: 8,
  },
  typingDots: {
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  typingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: SF.gold,
  },
  typingText: {
    color: SF.muted, fontSize: 12, fontStyle: "italic",
  },
  // Media viewer
  mediaViewerBg: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center",
  },
  mediaViewerClose: {
    position: "absolute", top: 50, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  mediaViewerImage: {
    width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32,
  },
});
