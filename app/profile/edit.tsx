import { View, Text, Pressable, StyleSheet, ScrollView, Platform, TextInput, Alert, KeyboardAvoidingView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, getApiUrl, queryClient } from '@/lib/query-client';
import { api } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from '@/lib/image-manipulator';
import { fetch } from 'expo/fetch';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';

interface UserData {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  postcode: number | null;
  country: string | null;
  location: string | null;
  avatarUrl?: string | null;
  website: string | null;
  socialLinks: { instagram?: string; twitter?: string; linkedin?: string; facebook?: string } | null;
}

type UploadedImage = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};

export default function EditProfileScreen() {
  const insets     = useSafeAreaInsets();
  const webTop     = 0;
  const webBottom  = Platform.OS === 'web' ? 34 : 0;
  const colors     = useColors();
  const { userId } = useAuth();

  const { data: user } = useQuery<UserData>({
    queryKey: ['/api/users/me', userId],
    enabled: !!userId,
    queryFn: () => api.users.me() as Promise<UserData>,
  });

  const [form, setForm] = useState({
    displayName: '', email: '', phone: '', bio: '', city: '', state: '', postcode: '', country: 'Australia',
    website: '', instagram: '', twitter: '', linkedin: '',
  });
  const [avatarUri,      setAvatarUri]      = useState<string | null>(null);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarScale,    setAvatarScale]    = useState<'original' | 'large' | 'medium'>('large');

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        email:       user.email       || '',
        phone:       user.phone       || '',
        bio:         user.bio         || '',
        city:        user.city        || '',
        state:       user.state       || '',
        postcode:    user.postcode != null ? String(user.postcode) : '',
        country:     user.country     || 'Australia',
        website:     user.website     || '',
        instagram:   user.socialLinks?.instagram || '',
        twitter:     user.socialLinks?.twitter   || '',
        linkedin:    user.socialLinks?.linkedin   || '',
      });
      setAvatarUri(user.avatarUrl || null);
    }
  }, [user]);

  const uploadMutation = useMutation({
    mutationFn: async (uri: string): Promise<UploadedImage> => {
      const actions = [
        { rotate: avatarRotation },
        ...(avatarScale === 'medium' ? [{ resize: { width: 1024 } }] : avatarScale === 'large' ? [{ resize: { width: 1600 } }] : []),
      ];

      let uploadUri = uri;
      try {
        const jpegFormat =
          SaveFormat && typeof SaveFormat === 'object' && 'JPEG' in SaveFormat
            ? SaveFormat.JPEG
            : undefined;

        const processed = await manipulateAsync(
          uri,
          actions,
          jpegFormat ? { compress: 0.92, format: jpegFormat } : { compress: 0.92 },
        );
        uploadUri = processed.uri;
      } catch {
        uploadUri = uri;
      }

      const formData = new FormData();
      const isDataUrl = uploadUri.startsWith('data:');

      if (Platform.OS === 'web' || isDataUrl) {
        // Validate URI to prevent SSRF attacks
        if (!isDataUrl && !uploadUri.startsWith('blob:') && !uploadUri.startsWith('file:')) {
          throw new Error('Invalid URI');
        }
        const blobRes = await fetch(uploadUri);
        const blob = await blobRes.blob();
        formData.append('image', blob as unknown as Blob, 'profile.jpg');
      } else {
        const mimeType = uploadUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        formData.append('image', {
          uri: uploadUri,
          name: 'profile.jpg',
          type: mimeType,
        } as unknown as Blob);
      }

      const base      = getApiUrl();
      const uploadRes = await fetch(`${base}api/uploads/image`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      return uploadRes.json() as Promise<UploadedImage>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest('PUT', `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me', userId] });
      queryClient.invalidateQueries({ queryKey: ['api/auth/me'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
      router.back();
    },
    onError: (err: Error) => { Alert.alert('Error', err.message); },
  });

  const handleChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload your profile image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      setAvatarRotation(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDropForWeb = async (event: { preventDefault: () => void; nativeEvent?: { dataTransfer?: { files?: File[] } } }) => {
    if (Platform.OS !== 'web') return;
    event.preventDefault();
    const file = event?.nativeEvent?.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setAvatarUri(String(reader.result)); setAvatarRotation(0); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) { Alert.alert('Required', 'Please enter your display name.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let avatarUrl = user?.avatarUrl || null;
    if (avatarUri && avatarUri !== user?.avatarUrl) {
      try {
        const uploaded = await uploadMutation.mutateAsync(avatarUri);
        avatarUrl = uploaded.imageUrl;
        await apiRequest('POST', '/api/media/attach', {
          targetType: 'user', targetId: userId,
          imageUrl: uploaded.imageUrl, thumbnailUrl: uploaded.thumbnailUrl,
          width: uploaded.width, height: uploaded.height,
        });
      } catch (error) { Alert.alert('Upload failed', String(error)); return; }
    }
    const trimmedCountry = form.country.trim() || 'Australia';
    const trimmedCity = form.city.trim();
    const trimmedState = form.state.trim().toUpperCase();
    const trimmedPostcode = form.postcode.trim();
    updateMutation.mutate({
      displayName: form.displayName.trim(),
      email:    form.email.trim()   || null,
      phone:    form.phone.trim()   || null,
      bio:      form.bio.trim()     || null,
      city:     trimmedCity || null,
      state:    trimmedState || null,
      postcode: trimmedPostcode ? Number(trimmedPostcode) : null,
      country:  trimmedCountry,
      location: trimmedCity ? `${trimmedCity}, ${trimmedCountry}` : null,
      avatarUrl,
      website: form.website.trim() || null,
      socialLinks: {
        instagram: form.instagram.trim() || undefined,
        twitter:   form.twitter.trim()   || undefined,
        linkedin:  form.linkedin.trim()  || undefined,
      },
    });
  };

  const isBusy = updateMutation.isPending || uploadMutation.isPending;

  const inputStyle = [s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderLight }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>Edit Profile</Text>
          <Pressable onPress={handleSave} disabled={isBusy} style={[s.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[s.saveBtnText, { color: colors.textInverse }, isBusy && { opacity: 0.5 }]}> 
              {isBusy ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom + webBottom }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={s.avatarSection}>
            <View
              style={[s.avatarDropZone, { borderColor: colors.borderLight }]}
              {...(Platform.OS === 'web' ? { onDrop: handleDropForWeb, onDragOver: (e: { preventDefault: () => void }) => e.preventDefault() } : {}) as object}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImage} />
              ) : (
                <View style={[s.avatar, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}>
                  <Ionicons name="person" size={40} color={colors.primary} />
                </View>
              )}
            </View>

            <View style={s.photoActionsRow}>
              <Pressable style={[s.changePhotoBtn, { backgroundColor: colors.primaryGlow }]} onPress={handleChoosePhoto}>
                <Ionicons name="camera" size={16} color={colors.primary} />
                <Text style={[s.changePhotoText, { color: colors.primary }]}>Pick Photo</Text>
              </Pressable>
              <Pressable style={[s.changePhotoBtn, { backgroundColor: colors.primaryGlow }]} onPress={() => setAvatarRotation(p => (p + 90) % 360)}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={[s.changePhotoText, { color: colors.primary }]}>Rotate</Text>
              </Pressable>
            </View>

            <View style={s.resizeRow}>
              {(['original', 'large', 'medium'] as const).map((preset) => (
                <Pressable
                  key={preset}
                  style={[s.resizeChip, { borderColor: colors.borderLight }, avatarScale === preset && { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
                  onPress={() => setAvatarScale(preset)}
                >
                  <Text style={[s.resizeChipText, { color: avatarScale === preset ? colors.primary : colors.text }]}>{preset}</Text>
                </Pressable>
              ))}
            </View>

            {isBusy && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
              {Platform.OS === 'web' && <Text style={[s.dragHint, { color: colors.text }]}>Tip: Drag & drop image here on web.</Text>}
          </View>

          {/* Personal info */}
          <View style={s.formSection}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>Personal Information</Text>

            <Text style={[s.fieldLabel, { color: colors.text }]}>Display Name *</Text>
            <TextInput style={inputStyle} value={form.displayName} onChangeText={v => setForm(p => ({ ...p, displayName: v }))}
              placeholder="Your full name" placeholderTextColor={colors.textSecondary} />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Email</Text>
            <TextInput style={inputStyle} value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))}
              placeholder="your@email.com" placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Phone</Text>
            <TextInput style={inputStyle} value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))}
              placeholder="+61 400 000 000" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Bio</Text>
            <TextInput style={[...inputStyle, s.bioInput]} value={form.bio} onChangeText={v => setForm(p => ({ ...p, bio: v }))}
              placeholder="Tell us about yourself..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} textAlignVertical="top" maxLength={280} />
            <Text style={[s.charCount, { color: colors.textSecondary }]}>{form.bio.length}/280</Text>
          </View>

          {/* Location */}
          <View style={s.formSection}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>Location</Text>

            <View style={s.rowFields}>
              <View style={s.halfField}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>City</Text>
                <TextInput style={inputStyle} value={form.city} onChangeText={v => setForm(p => ({ ...p, city: v }))}
                  placeholder="Sydney" placeholderTextColor={colors.textSecondary} />
              </View>

              <View style={s.halfField}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>State</Text>
                <TextInput style={inputStyle} value={form.state} onChangeText={v => setForm(p => ({ ...p, state: v }))}
                  placeholder="NSW" placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
              </View>
            </View>

            <View style={s.rowFields}>
              <View style={s.halfField}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>Postcode</Text>
                <TextInput style={inputStyle} value={form.postcode} onChangeText={v => setForm(p => ({ ...p, postcode: v }))}
                  placeholder="2000" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" />
              </View>

              <View style={s.halfField}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>Country</Text>
                <TextInput style={inputStyle} value={form.country} onChangeText={v => setForm(p => ({ ...p, country: v }))}
                  placeholder="Australia" placeholderTextColor={colors.textSecondary} />
              </View>
            </View>
          </View>

          {/* Social links */}
          <View style={s.formSection}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>Social Links</Text>

            {[
              { icon: 'logo-instagram', color: '#E4405F', field: 'instagram' as const, placeholder: 'Instagram URL' },
              { icon: 'logo-twitter',   color: '#1DA1F2', field: 'twitter'   as const, placeholder: 'Twitter URL'   },
              { icon: 'logo-linkedin',  color: '#0A66C2', field: 'linkedin'  as const, placeholder: 'LinkedIn URL'  },
              { icon: 'globe-outline',  color: colors.primary, field: 'website' as const, placeholder: 'Website URL' },
            ].map(({ icon, color, field, placeholder }) => (
              <View key={field} style={s.socialRow}>
                <View style={[s.socialIcon, { backgroundColor: color + '15' }]}>
                  <Ionicons name={icon as never} size={18} color={color} />
                </View>
                <TextInput
                  style={[...inputStyle, { flex: 1 }]}
                  value={form[field]}
                  onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:          { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:      { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  saveBtn:          { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveBtnText:      { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  avatarSection:    { alignItems: 'center', paddingVertical: 20 },
  avatarDropZone:   { borderWidth: 1, borderStyle: 'dashed', borderRadius: 60, padding: 6, marginBottom: 10 },
  avatar:           { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  avatarImage:      { width: 100, height: 100, borderRadius: 50 },
  photoActionsRow:  { flexDirection: 'row', gap: 10 },
  changePhotoBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  changePhotoText:  { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  resizeRow:        { flexDirection: 'row', gap: 8, marginTop: 10 },
  resizeChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  resizeChipText:   { fontSize: 12, fontFamily: 'Poppins_500Medium', textTransform: 'capitalize' as const },
  dragHint:         { marginTop: 8, fontSize: 11, fontFamily: 'Poppins_400Regular' },
  formSection:      { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel:     { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  fieldLabel:       { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginBottom: 6, marginTop: 12 },
  input:            { borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Poppins_400Regular', borderWidth: 1 },
  bioInput:         { minHeight: 100, paddingTop: 14 },
  charCount:        { fontSize: 11, fontFamily: 'Poppins_400Regular', textAlign: 'right', marginTop: 4 },
  rowFields:        { flexDirection: 'row', gap: 12 },
  halfField:        { flex: 1 },
  socialRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  socialIcon:       { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
