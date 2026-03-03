import { View, Text, Pressable, StyleSheet, ScrollView, Platform, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, getApiUrl, queryClient } from '@/lib/query-client';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from '@/lib/image-manipulator';
import { fetch } from 'expo/fetch';
import { useRole } from '@/hooks/useRole';
import { AuthGuard } from '@/components/AuthGuard';
import { getPostcodeData, getPostcodesByPlace } from '@shared/location/australian-postcodes';

type SubmitType = 'event' | 'organisation' | 'business' | 'artist' | 'perk';

const TABS: { key: SubmitType; label: string; icon: string }[] = [
  { key: 'event',        label: 'Event',        icon: 'calendar' },
  { key: 'organisation', label: 'Organisation',  icon: 'people' },
  { key: 'business',     label: 'Business',      icon: 'business' },
  { key: 'artist',       label: 'Artist',        icon: 'color-palette' },
  { key: 'perk',         label: 'Perk',          icon: 'gift' },
];

const EVENT_CATEGORIES   = ['Cultural', 'Music', 'Dance', 'Festival', 'Workshop', 'Religious', 'Food', 'Sports'];
const ORG_CATEGORIES     = ['Cultural', 'Religious', 'Community', 'Youth', 'Professional'];
const BIZ_CATEGORIES     = ['Restaurant', 'Retail', 'Services', 'Beauty', 'Tech', 'Grocery'];
const ARTIST_GENRES      = ['Music', 'Dance', 'Visual Arts', 'Theatre', 'Film', 'Literature'];
const PERK_TYPES = [
  { key: 'discount_percent', label: '% Discount' },
  { key: 'discount_fixed',   label: '$ Discount' },
  { key: 'free_ticket',      label: 'Free Ticket' },
  { key: 'early_access',     label: 'Early Access' },
  { key: 'vip_upgrade',      label: 'VIP Upgrade' },
  { key: 'cashback',         label: 'Cashback' },
];
const PERK_CATEGORIES = ['tickets', 'events', 'dining', 'shopping', 'wallet'];

const initialForm = {
  name: '', description: '', city: '', state: '', postcode: '', country: 'Australia', contactEmail: '', phone: '',
  website: '', category: '', abn: '', socialMedia: '', date: '', time: '',
  venue: '', address: '', price: '', capacity: '', perkType: '',
  discountValue: '', providerName: '', perkCategory: '',
};

type DerivedLocation = {
  city: string;
  state: string;
  country: string;
  postcode: number;
  latitude: number;
  longitude: number;
};

export default function SubmitScreen() {
  const insets = useSafeAreaInsets();
  const webTop    = Platform.OS === 'web' ? 0 : 0;
  const webBottom = Platform.OS === 'web' ? 34 : 0;
  const colors    = useColors();
  const [activeTab, setActiveTab] = useState<SubmitType>('event');
  const [form, setForm] = useState({ ...initialForm });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const { isAdmin, isOrganizer } = useRole();

  const visibleTabs = TABS.filter(t => t.key !== 'perk' || isAdmin);

  const submitProfileMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/profiles', data);
      return res.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Your listing has been submitted for review.');
      setForm({ ...initialForm });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const submitEventMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/events', data);
      return res.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Your event has been created as a draft.');
      setForm({ ...initialForm });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const submitPerkMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest('POST', '/api/perks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Created', 'Your perk has been created successfully.');
      setForm({ ...initialForm });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const uploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
    if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
  };

  const uploadAndAttach = async (targetType: 'event' | 'profile' | 'business' | 'post', targetId: string) => {
    if (!imageUri) return;
    const processed = await manipulateAsync(imageUri, [{ resize: { width: 1600 } }], { compress: 0.9, format: SaveFormat.JPEG });
    const blobRes = await fetch(processed.uri);
    const blob = await blobRes.blob();
    const formData = new FormData();
    formData.append('image', blob as unknown as Blob, 'upload.jpg');

    const base = getApiUrl();
    const uploadRes = await fetch(`${base}api/uploads/image`, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error('Failed image upload');
    const uploaded = await uploadRes.json() as Record<string, unknown>;

    await apiRequest('POST', '/api/media/attach', {
      targetType,
      targetId,
      imageUrl:     uploaded.imageUrl,
      thumbnailUrl: uploaded.thumbnailUrl,
      width:        uploaded.width,
      height:       uploaded.height,
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Please enter a name / title.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const deriveLocation = (): DerivedLocation | null => {
      const city = form.city.trim();
      const state = form.state.trim().toUpperCase();
      const country = (form.country.trim() || 'Australia');
      const postcode = parseInt(form.postcode.trim(), 10);

      if (!city || !state || !form.postcode.trim() || Number.isNaN(postcode)) {
        Alert.alert('Required', 'City, state, and postcode are required.');
        return null;
      }

      const byPostcode = getPostcodeData(postcode);
      if (!byPostcode) {
        Alert.alert('Invalid postcode', 'Please enter a valid Australian postcode.');
        return null;
      }

      const cityMatch = getPostcodesByPlace(city).find(
        (entry) => entry.state_code.toUpperCase() === state,
      );

      const resolved = cityMatch ?? byPostcode;
      return {
        city: resolved.place_name,
        state: resolved.state_code,
        country,
        postcode: resolved.postcode,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      };
    };

    if (activeTab === 'event') {
      if (!isOrganizer) {
        Alert.alert('Organizer access required', 'Only organizer or admin accounts can create events.');
        return;
      }
      if (!form.date.trim()) { Alert.alert('Required', 'Please enter an event date.'); return; }
      const location = deriveLocation();
      if (!location) return;

      submitEventMutation.mutate({
        title: form.name.trim(),
        description: form.description.trim() || null,
        date: form.date.trim(),
        time: form.time.trim() || null,
        venue: form.venue.trim() || null,
        address: form.address.trim() || null,
        city: location.city,
        state: location.state,
        postcode: location.postcode,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        category: form.category || 'Cultural',
        contactEmail: form.contactEmail.trim() || null,
        priceCents: form.price.trim() ? Math.round(Number(form.price.trim()) * 100) : 0,
        capacity: form.capacity.trim() ? Number(form.capacity.trim()) : null,
        isFree: !form.price.trim() || Number(form.price.trim()) <= 0,
      });
    } else if (activeTab === 'perk') {
      if (!form.perkType) { Alert.alert('Required', 'Please select a perk type.'); return; }
      const discountVal = parseInt(form.discountValue || '0', 10);
      submitPerkMutation.mutate({
        title: form.name.trim(),
        description: form.description.trim() || null,
        perkType: form.perkType,
        discountPercent: form.perkType === 'discount_percent' ? discountVal : null,
        discountFixedCents: form.perkType === 'discount_fixed' || form.perkType === 'cashback' ? discountVal * 100 : null,
        providerName: form.providerName.trim() || null,
        providerType: 'sponsor',
        category: form.perkCategory || null,
        isMembershipRequired: false,
        status: 'active',
      });
    } else {
      if (!form.contactEmail.trim()) { Alert.alert('Required', 'Please enter a contact email.'); return; }
      const location = deriveLocation();
      if (!location) return;

      submitProfileMutation.mutate({
        entityType: activeTab,
        name: form.name.trim(),
        description: form.description.trim() || null,
        city: location.city,
        state: location.state,
        postcode: location.postcode,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        contactEmail: form.contactEmail.trim(),
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        category: form.category || null,
      });
    }
  };

  useEffect(() => {
    const maybeAttach = async () => {
      const created = submitProfileMutation.data;
      if (!created?.id || !imageUri) return;
      const targetType = activeTab === 'event' ? 'event' : activeTab === 'business' ? 'business' : 'profile';
      try { await uploadAndAttach(targetType, String(created.id)); } catch {}
    };
    maybeAttach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitProfileMutation.data]);

  useEffect(() => {
    const maybeAttach = async () => {
      const created = submitEventMutation.data;
      if (!created?.id || !imageUri) return;
      try { await uploadAndAttach('event', String(created.id)); } catch {}
    };
    maybeAttach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitEventMutation.data]);

  const getCategoryOptions = () => {
    if (activeTab === 'event')        return EVENT_CATEGORIES;
    if (activeTab === 'organisation') return ORG_CATEGORIES;
    if (activeTab === 'business')     return BIZ_CATEGORIES;
    if (activeTab === 'artist')       return ARTIST_GENRES;
    return [];
  };

  const getCategoryLabel = () => activeTab === 'artist' ? 'Genre / Category' : 'Category';
  const isPending = submitProfileMutation.isPending || submitPerkMutation.isPending || submitEventMutation.isPending;

  return (
    <AuthGuard icon="add-circle-outline" title="Submit Content" message="Sign in to submit events, organisations, and more.">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>Create New</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 + insets.bottom + webBottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
              {visibleTabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[s.tab, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.key);
                    setForm({ ...initialForm });
                  }}
                >
                  <Ionicons name={tab.icon as never} size={16} color={activeTab === tab.key ? '#FFF' : colors.textSecondary} />
                  <Text style={[s.tabText, { color: colors.textSecondary }, activeTab === tab.key && { color: '#FFF' }]}>{tab.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {activeTab === 'event' && !isOrganizer && (
            <View style={[s.formSection, { marginTop: -8 }]}> 
              <View style={[s.roleNotice, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '55' }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                <Text style={[s.roleNoticeText, { color: colors.textSecondary }]}>Only organizer or admin accounts can publish event submissions.</Text>
              </View>
            </View>
          )}

          {/* Basic Information */}
          <View style={s.formSection}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>Basic Information</Text>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
              {activeTab === 'event' ? 'Event Title' : activeTab === 'perk' ? 'Perk Title' : 'Name'} *
            </Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
              placeholder={
                activeTab === 'event'   ? 'e.g. Diwali Festival 2026' :
                activeTab === 'perk'    ? 'e.g. 20% off event tickets' :
                activeTab === 'artist'  ? 'Artist / Stage name' :
                activeTab === 'business'? 'Business name' : 'Organisation name'
              }
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[s.input, s.textArea, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
              value={form.description}
              onChangeText={v => setForm(p => ({ ...p, description: v }))}
              placeholder="Tell us more..."
              placeholderTextColor={colors.textTertiary}
              multiline numberOfLines={4} textAlignVertical="top" maxLength={500}
            />

            <Pressable style={[s.mediaBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' }]} onPress={uploadImage}>
              <Ionicons name="image-outline" size={16} color={colors.primary} />
              <Text style={[s.mediaBtnText, { color: colors.primary }]}>{imageUri ? 'Replace Media' : 'Upload Media'}</Text>
            </Pressable>
          </View>

          {/* Event Details */}
          {activeTab === 'event' && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Event Details</Text>
              {[
                { label: 'Date *',   field: 'date',    placeholder: 'YYYY-MM-DD' },
                { label: 'Time',     field: 'time',    placeholder: 'e.g. 6:00 PM' },
                { label: 'Venue',    field: 'venue',   placeholder: 'Venue name' },
                { label: 'Address',  field: 'address', placeholder: 'Full address' },
              ].map(({ label, field, placeholder }) => (
                <View key={field}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form[field as keyof typeof form]}
                    onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
                    placeholder={placeholder} placeholderTextColor={colors.textTertiary}
                  />
                </View>
              ))}
              <View style={s.rowFields}>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Price ($)</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.price} onChangeText={v => setForm(p => ({ ...p, price: v }))}
                    placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="numeric" />
                </View>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Capacity</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.capacity} onChangeText={v => setForm(p => ({ ...p, capacity: v }))}
                    placeholder="100" placeholderTextColor={colors.textTertiary} keyboardType="numeric" />
                </View>
              </View>
            </View>
          )}

          {/* Perk Type */}
          {activeTab === 'perk' && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Perk Type *</Text>
              <View style={s.categoryGrid}>
                {PERK_TYPES.map(pt => (
                  <Pressable
                    key={pt.key}
                    style={[s.categoryChip, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      form.perkType === pt.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, perkType: p.perkType === pt.key ? '' : pt.key })); }}
                  >
                    <Text style={[s.categoryText, { color: colors.textSecondary }, form.perkType === pt.key && { color: '#FFF' }]}>{pt.label}</Text>
                  </Pressable>
                ))}
              </View>

              {(form.perkType === 'discount_percent' || form.perkType === 'discount_fixed' || form.perkType === 'cashback') && (
                <>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    {form.perkType === 'discount_percent' ? 'Discount (%)' : 'Amount ($)'}
                  </Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.discountValue} onChangeText={v => setForm(p => ({ ...p, discountValue: v }))}
                    placeholder={form.perkType === 'discount_percent' ? '20' : '10'}
                    placeholderTextColor={colors.textTertiary} keyboardType="numeric" />
                </>
              )}

              <Text style={[s.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Provider Name</Text>
              <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                value={form.providerName} onChangeText={v => setForm(p => ({ ...p, providerName: v }))}
                placeholder="e.g. CulturePass" placeholderTextColor={colors.textTertiary} />

              <Text style={[s.sectionLabel, { color: colors.text, marginTop: 20 }]}>Perk Category</Text>
              <View style={s.categoryGrid}>
                {PERK_CATEGORIES.map(cat => (
                  <Pressable
                    key={cat}
                    style={[s.categoryChip, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      form.perkCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, perkCategory: p.perkCategory === cat ? '' : cat })); }}
                  >
                    <Text style={[s.categoryText, { color: colors.textSecondary }, form.perkCategory === cat && { color: '#FFF' }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Location */}
          {(activeTab !== 'event' && activeTab !== 'perk') && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Location</Text>
              <View style={s.rowFields}>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>City</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.city} onChangeText={v => setForm(p => ({ ...p, city: v }))}
                    placeholder="Sydney" placeholderTextColor={colors.textTertiary} />
                </View>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>State</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.state} onChangeText={v => setForm(p => ({ ...p, state: v }))}
                    placeholder="NSW" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />
                </View>
              </View>
              <View style={s.rowFields}>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Postcode</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.postcode} onChangeText={v => setForm(p => ({ ...p, postcode: v }))}
                    placeholder="2000" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
                </View>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Country</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.country} onChangeText={v => setForm(p => ({ ...p, country: v }))}
                    placeholder="Australia" placeholderTextColor={colors.textTertiary} />
                </View>
              </View>
            </View>
          )}

          {activeTab === 'event' && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Location</Text>
              <View style={s.rowFields}>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>City</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.city} onChangeText={v => setForm(p => ({ ...p, city: v }))}
                    placeholder="Sydney" placeholderTextColor={colors.textTertiary} />
                </View>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>State</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.state} onChangeText={v => setForm(p => ({ ...p, state: v }))}
                    placeholder="NSW" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />
                </View>
              </View>
              <View style={s.rowFields}>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Postcode</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.postcode} onChangeText={v => setForm(p => ({ ...p, postcode: v }))}
                    placeholder="2000" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
                </View>
                <View style={s.halfField}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Country</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form.country} onChangeText={v => setForm(p => ({ ...p, country: v }))}
                    placeholder="Australia" placeholderTextColor={colors.textTertiary} />
                </View>
              </View>
            </View>
          )}

          {/* Contact Details */}
          {activeTab !== 'perk' && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Contact Details</Text>
              {[
                { label: `Contact Email${activeTab !== 'event' ? ' *' : ''}`, field: 'contactEmail', placeholder: 'contact@example.com', keyboard: 'email-address' as const, autoCapitalize: 'none' as const },
                { label: 'Phone',   field: 'phone',   placeholder: '+61 400 000 000',    keyboard: 'phone-pad' as const,   autoCapitalize: 'sentences' as const },
                { label: 'Website', field: 'website', placeholder: 'https://example.com', keyboard: 'default' as const,    autoCapitalize: 'none' as const },
              ].map(({ label, field, placeholder, keyboard, autoCapitalize }) => (
                <View key={field}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                    value={form[field as keyof typeof form]} onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
                    placeholder={placeholder} placeholderTextColor={colors.textTertiary}
                    keyboardType={keyboard} autoCapitalize={autoCapitalize} />
                </View>
              ))}
            </View>
          )}

          {/* Category */}
          {activeTab !== 'perk' && getCategoryOptions().length > 0 && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>{getCategoryLabel()}</Text>
              <View style={s.categoryGrid}>
                {getCategoryOptions().map((cat) => (
                  <Pressable
                    key={cat}
                    style={[s.categoryChip, { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      form.category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, category: p.category === cat ? '' : cat })); }}
                  >
                    <Text style={[s.categoryText, { color: colors.textSecondary }, form.category === cat && { color: '#FFF' }]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'business' && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Business Details</Text>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>ABN (Australian Business Number)</Text>
              <TextInput style={[s.input, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                value={form.abn} onChangeText={v => setForm(p => ({ ...p, abn: v }))}
                placeholder="XX XXX XXX XXX" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
            </View>
          )}

          {activeTab === 'artist' && (
            <View style={s.formSection}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Social Media</Text>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Social Media Links</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: colors.surface, borderColor: colors.borderLight, color: colors.text }]}
                value={form.socialMedia} onChangeText={v => setForm(p => ({ ...p, socialMedia: v }))}
                placeholder="Instagram, Facebook, YouTube, etc. (one per line)"
                placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} textAlignVertical="top"
              />
            </View>
          )}

          {/* Submit */}
          <View style={s.submitSection}>
            <Pressable style={[s.submitBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isPending}>
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={s.submitBtnText}>{isPending ? 'Submitting...' : 'Submit'}</Text>
            </Pressable>
            <Text style={[s.submitNote, { color: colors.textTertiary }]}>
              {activeTab === 'perk'
                ? 'Your perk will be created and made available to users immediately.'
                : 'All submissions are reviewed by our team within 2-3 business days. You will receive an email notification once your listing is approved.'}
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
    </AuthGuard>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:          { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:      { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  tabScroll:        { paddingHorizontal: 20, gap: 8, paddingBottom: 20 },
  tab:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  tabText:          { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  formSection:      { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel:     { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  fieldLabel:       { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginBottom: 6, marginTop: 12 },
  input:            { borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Poppins_400Regular', borderWidth: 1 },
  textArea:         { minHeight: 100, paddingTop: 14 },
  mediaBtn:         { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  mediaBtnText:     { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  rowFields:        { flexDirection: 'row', gap: 12 },
  halfField:        { flex: 1 },
  categoryGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  categoryText:     { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  submitSection:    { paddingHorizontal: 20, marginTop: 8, marginBottom: 24 },
  roleNotice:       { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleNoticeText:   { fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1 },
  submitBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16 },
  submitBtnText:    { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFF' },
  submitNote:       { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 12, textAlign: 'center', lineHeight: 18 },
});
