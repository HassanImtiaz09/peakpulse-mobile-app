import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  FlatList,
  Modal,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/lib/trpc";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80";

type PostType = "progress" | "achievement" | "challenge";

interface Post {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  type: PostType;
  caption?: string;
  weightKg?: number;
  bodyFatPercent?: number;
  photoUrl?: string;
  achievement?: string;
  likes: number;
  createdAt: string;
}

const CHALLENGES = [
  { id: 1, title: "30-Day Squat Challenge", participants: 1243, daysLeft: 12, emoji: "🏋️", color: "#7c3aed" },
  { id: 2, title: "10K Steps Daily", participants: 3891, daysLeft: 5, emoji: "🚶", color: "#0ea5e9" },
  { id: 3, title: "No Sugar February", participants: 892, daysLeft: 18, emoji: "🚫", color: "#ef4444" },
  { id: 4, title: "7-Day Plank Streak", participants: 567, daysLeft: 3, emoji: "💪", color: "#22c55e" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SocialFeedScreen() {
  const router = useRouter();
  const { isGuest, guestProfile } = useGuestAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "challenges">("feed");
  const [showPostModal, setShowPostModal] = useState(false);
  const [postType, setPostType] = useState<PostType>("progress");
  const [caption, setCaption] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [achievement, setAchievement] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [posting, setPosting] = useState(false);

  const feedQuery = trpc.social.getFeed.useQuery({ limit: 20, offset: 0 });
  const createPost = trpc.social.createPost.useMutation({
    onSuccess: () => {
      feedQuery.refetch();
      setShowPostModal(false);
      setCaption("");
      setWeight("");
      setBodyFat("");
      setAchievement("");
      setSelectedPhoto(null);
      setPosting(false);
      Alert.alert("Posted!", "Your progress has been shared with the community. 🎉");
    },
    onError: () => {
      setPosting(false);
      Alert.alert("Error", "Could not post. Please sign in to share with the community.");
    },
  });

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    if (!isGuest && !guestProfile) {
      Alert.alert("Sign In Required", "Please sign in to share with the community.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login") },
      ]);
      return;
    }
    if (!caption.trim() && !weight && !bodyFat && !achievement) {
      Alert.alert("Add Content", "Please add a caption, stats, or achievement to share.");
      return;
    }
    setPosting(true);
    createPost.mutate({
      type: postType,
      caption: caption.trim() || undefined,
      weightKg: weight ? parseFloat(weight) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      achievement: achievement.trim() || undefined,
      photoUrl: selectedPhoto ?? undefined,
    });
  };

  const handleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const posts: Post[] = (feedQuery.data?.posts ?? []).map((p: any) => ({ ...p, type: (p.type ?? "progress") as PostType }));

  const renderPost = ({ item: post }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{post.userAvatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.postUserName}>{post.userName}</Text>
          <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={[styles.typeBadge, post.type === "achievement" ? styles.typeBadgeGold : post.type === "challenge" ? styles.typeBadgeBlue : styles.typeBadgePurple]}>
          <Text style={styles.typeBadgeText}>
            {post.type === "achievement" ? "🏆 Achievement" : post.type === "challenge" ? "⚡ Challenge" : "📈 Progress"}
          </Text>
        </View>
      </View>

      {post.photoUrl && (
        <Image source={{ uri: post.photoUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {post.achievement && (
        <View style={styles.achievementBanner}>
          <Text style={styles.achievementText}>🏆 {post.achievement}</Text>
        </View>
      )}

      {post.caption && (
        <Text style={styles.postCaption}>{post.caption}</Text>
      )}

      {(post.weightKg || post.bodyFatPercent) && (
        <View style={styles.statsRow}>
          {post.weightKg && (
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Weight</Text>
              <Text style={styles.statChipValue}>{post.weightKg} kg</Text>
            </View>
          )}
          {post.bodyFatPercent && (
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Body Fat</Text>
              <Text style={styles.statChipValue}>{post.bodyFatPercent}%</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.likeBtn} onPress={() => handleLike(post.id)}>
          <Text style={styles.likeBtnText}>
            {likedPosts.has(post.id) ? "❤️" : "🤍"} {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.commentBtn}>
          <Text style={styles.commentBtnText}>💬 Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>↗ Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-black">
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={styles.hero}>
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>COMMUNITY</Text>
            <Text style={styles.heroTitle}>Social Feed</Text>
            <Text style={styles.heroSub}>Share progress · Join challenges · Inspire others</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "feed" && styles.tabActive]}
          onPress={() => setActiveTab("feed")}
        >
          <Text style={[styles.tabText, activeTab === "feed" && styles.tabTextActive]}>📰 Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "challenges" && styles.tabActive]}
          onPress={() => setActiveTab("challenges")}
        >
          <Text style={[styles.tabText, activeTab === "challenges" && styles.tabTextActive]}>⚡ Challenges</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "feed" ? (
        <>
          {/* Share Button */}
          <View style={styles.shareBarRow}>
            <TouchableOpacity style={styles.shareBarBtn} onPress={() => setShowPostModal(true)}>
              <Text style={styles.shareBarBtnText}>+ Share Your Progress</Text>
            </TouchableOpacity>
          </View>

          {feedQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#7c3aed" size="large" />
              <Text style={styles.loadingText}>Loading community feed...</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🌟</Text>
                  <Text style={styles.emptyTitle}>Be the first to share!</Text>
                  <Text style={styles.emptyText}>Share your progress and inspire the community.</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={styles.challengesTitle}>Active Challenges</Text>
          <Text style={styles.challengesSub}>Join a challenge and stay accountable with the community</Text>
          {CHALLENGES.map((challenge) => (
            <View key={challenge.id} style={[styles.challengeCard, { borderLeftColor: challenge.color }]}>
              <View style={styles.challengeLeft}>
                <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                <View>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeParticipants}>
                    👥 {challenge.participants.toLocaleString()} participants
                  </Text>
                </View>
              </View>
              <View style={styles.challengeRight}>
                <Text style={styles.challengeDays}>{challenge.daysLeft}</Text>
                <Text style={styles.challengeDaysLabel}>days left</Text>
                <TouchableOpacity
                  style={[styles.joinBtn, { backgroundColor: challenge.color }]}
                  onPress={() => Alert.alert("Challenge Joined! 🎉", `You've joined the "${challenge.title}" challenge. Check back daily to log your progress.`)}
                >
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.createChallengeCard}>
            <Text style={styles.createChallengeTitle}>🏆 Create a Challenge</Text>
            <Text style={styles.createChallengeText}>
              Challenge your friends or the whole community to a fitness goal. Coming soon in the Advanced plan.
            </Text>
            <TouchableOpacity
              style={styles.createChallengeBtn}
              onPress={() => router.push("/subscription")}
            >
              <Text style={styles.createChallengeBtnText}>Upgrade to Advanced →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Post Modal */}
      <Modal visible={showPostModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPostModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Progress</Text>
            <TouchableOpacity onPress={handlePost} disabled={posting}>
              {posting ? (
                <ActivityIndicator color="#7c3aed" size="small" />
              ) : (
                <Text style={styles.modalPost}>Post</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Post Type */}
            <Text style={styles.modalLabel}>Post Type</Text>
            <View style={styles.postTypeRow}>
              {(["progress", "achievement", "challenge"] as PostType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.postTypeBtn, postType === t && styles.postTypeBtnActive]}
                  onPress={() => setPostType(t)}
                >
                  <Text style={[styles.postTypeBtnText, postType === t && styles.postTypeBtnTextActive]}>
                    {t === "progress" ? "📈 Progress" : t === "achievement" ? "🏆 Achievement" : "⚡ Challenge"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Caption */}
            <Text style={styles.modalLabel}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Share your story with the community..."
              placeholderTextColor="#6b7280"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
            />

            {/* Stats */}
            <Text style={styles.modalLabel}>Stats (optional)</Text>
            <View style={styles.statsInputRow}>
              <View style={styles.statsInputGroup}>
                <Text style={styles.statsInputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.statsInput}
                  placeholder="e.g. 75"
                  placeholderTextColor="#6b7280"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.statsInputGroup}>
                <Text style={styles.statsInputLabel}>Body Fat %</Text>
                <TextInput
                  style={styles.statsInput}
                  placeholder="e.g. 18"
                  placeholderTextColor="#6b7280"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {postType === "achievement" && (
              <>
                <Text style={styles.modalLabel}>Achievement Name</Text>
                <TextInput
                  style={styles.statsInput}
                  placeholder="e.g. First 5K Run"
                  placeholderTextColor="#6b7280"
                  value={achievement}
                  onChangeText={setAchievement}
                />
              </>
            )}

            {/* Photo */}
            <Text style={styles.modalLabel}>Photo (optional)</Text>
            <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickPhoto}>
              {selectedPhoto ? (
                <Image source={{ uri: selectedPhoto }} style={styles.selectedPhoto} />
              ) : (
                <Text style={styles.photoPickerText}>📷 Add Photo</Text>
              )}
            </TouchableOpacity>

            {!isGuest && !guestProfile && (
              <View style={styles.signInNote}>
                <Text style={styles.signInNoteText}>
                  ⚠️ Sign in to post to the community feed. Guest posts are not saved.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200 },
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", padding: 20, justifyContent: "space-between" },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: "#fff", fontSize: 16 },
  heroContent: { paddingBottom: 10 },
  heroLabel: { color: "#a78bfa", fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 4 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  tabBar: { flexDirection: "row", backgroundColor: "#111", borderBottomWidth: 1, borderBottomColor: "#222" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
  tabText: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#a78bfa" },
  shareBarRow: { padding: 12, backgroundColor: "#0a0a0a" },
  shareBarBtn: { backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  shareBarBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText: { color: "#6b7280", marginTop: 12, fontSize: 14 },
  postCard: { backgroundColor: "#111827", borderRadius: 16, marginBottom: 16, overflow: "hidden", borderWidth: 1, borderColor: "#1f2937" },
  postHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1f2937", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22 },
  postUserName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postTime: { color: "#6b7280", fontSize: 12 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgePurple: { backgroundColor: "#2d1b69" },
  typeBadgeGold: { backgroundColor: "#451a03" },
  typeBadgeBlue: { backgroundColor: "#0c2340" },
  typeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  postImage: { width: "100%", height: 220 },
  achievementBanner: { backgroundColor: "#451a03", padding: 12, margin: 14, borderRadius: 10 },
  achievementText: { color: "#fbbf24", fontSize: 15, fontWeight: "700", textAlign: "center" },
  postCaption: { color: "#e5e7eb", fontSize: 14, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 10 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 10 },
  statChip: { backgroundColor: "#1f2937", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  statChipLabel: { color: "#6b7280", fontSize: 11 },
  statChipValue: { color: "#a78bfa", fontSize: 16, fontWeight: "700" },
  postActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1f2937", paddingVertical: 10, paddingHorizontal: 14, gap: 16 },
  likeBtn: { flexDirection: "row", alignItems: "center" },
  likeBtnText: { color: "#9ca3af", fontSize: 14 },
  commentBtn: {},
  commentBtnText: { color: "#9ca3af", fontSize: 14 },
  shareBtn: {},
  shareBtnText: { color: "#9ca3af", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: "#6b7280", fontSize: 14, textAlign: "center" },
  challengesTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  challengesSub: { color: "#6b7280", fontSize: 13, marginBottom: 20, lineHeight: 20 },
  challengeCard: { backgroundColor: "#111827", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderLeftWidth: 4 },
  challengeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  challengeEmoji: { fontSize: 28 },
  challengeTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  challengeParticipants: { color: "#6b7280", fontSize: 12 },
  challengeRight: { alignItems: "center", gap: 4 },
  challengeDays: { color: "#fff", fontSize: 24, fontWeight: "800" },
  challengeDaysLabel: { color: "#6b7280", fontSize: 11 },
  joinBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  joinBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  createChallengeCard: { backgroundColor: "#1e0a3c", borderRadius: 14, padding: 20, marginTop: 8, borderWidth: 1, borderColor: "#4c1d95" },
  createChallengeTitle: { color: "#c4b5fd", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  createChallengeText: { color: "#9ca3af", fontSize: 13, lineHeight: 20, marginBottom: 14 },
  createChallengeBtn: { backgroundColor: "#7c3aed", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  createChallengeBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  modalContainer: { flex: 1, backgroundColor: "#0a0a0a" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  modalCancel: { color: "#9ca3af", fontSize: 16 },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalPost: { color: "#7c3aed", fontSize: 16, fontWeight: "700" },
  modalBody: { flex: 1, padding: 16 },
  modalLabel: { color: "#9ca3af", fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  postTypeRow: { flexDirection: "row", gap: 8 },
  postTypeBtn: { flex: 1, backgroundColor: "#1f2937", borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  postTypeBtnActive: { backgroundColor: "#2d1b69", borderColor: "#7c3aed" },
  postTypeBtnText: { color: "#9ca3af", fontSize: 12, fontWeight: "600" },
  postTypeBtnTextActive: { color: "#c4b5fd" },
  captionInput: { backgroundColor: "#1f2937", borderRadius: 12, padding: 14, color: "#fff", fontSize: 14, lineHeight: 22, minHeight: 100, textAlignVertical: "top", borderWidth: 1, borderColor: "#374151" },
  statsInputRow: { flexDirection: "row", gap: 12 },
  statsInputGroup: { flex: 1 },
  statsInputLabel: { color: "#6b7280", fontSize: 12, marginBottom: 6 },
  statsInput: { backgroundColor: "#1f2937", borderRadius: 10, padding: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#374151" },
  photoPickerBtn: { backgroundColor: "#1f2937", borderRadius: 12, height: 120, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#374151", borderStyle: "dashed", overflow: "hidden" },
  photoPickerText: { color: "#6b7280", fontSize: 16 },
  selectedPhoto: { width: "100%", height: "100%" },
  signInNote: { backgroundColor: "#1c0a00", borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: "#92400e" },
  signInNoteText: { color: "#fbbf24", fontSize: 12, lineHeight: 18 },
});
