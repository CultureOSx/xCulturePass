import { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { api, type ActivityData, type ActivityInput } from '@/lib/api';
import BrowsePage, { BrowseItem, CategoryFilter } from '@/components/BrowsePage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { CultureTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

const activityCategories: CategoryFilter[] = [
  { label: 'All', icon: 'compass', color: CultureTokens.indigo },
  { label: 'Theme Parks', icon: 'happy', color: CultureTokens.saffron },
  { label: 'Gaming', icon: 'game-controller', color: CultureTokens.community },
  { label: 'Workshops', icon: 'construct', color: CultureTokens.gold },
  { label: 'Nature', icon: 'leaf', color: CultureTokens.teal },
  { label: 'Fitness', icon: 'fitness', color: CultureTokens.coral },
];

type ActivityFormState = {
  name: string;
  description: string;
  category: string;
  duration: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  location: string;
  imageUrl: string;
  priceLabel: string;
};

const emptyForm = (city = '', country = 'Australia'): ActivityFormState => ({
  name: '',
  description: '',
  category: '',
  duration: '',
  city,
  state: '',
  postcode: '',
  country,
  location: '',
  imageUrl: '',
  priceLabel: 'Free',
});

function toPayload(form: ActivityFormState): ActivityInput {
  const postcodeNum = Number(form.postcode);
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    duration: form.duration.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim() || undefined,
    postcode: Number.isFinite(postcodeNum) && postcodeNum > 0 ? postcodeNum : undefined,
    country: form.country.trim() || 'Australia',
    location: form.location.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    priceLabel: form.priceLabel.trim() || 'Free',
    status: 'published',
    ownerType: 'business',
  };
}

function formFromActivity(activity: ActivityData): ActivityFormState {
  return {
    name: activity.name ?? '',
    description: activity.description ?? '',
    category: activity.category ?? '',
    duration: activity.duration ?? '',
    city: activity.city ?? '',
    state: activity.state ?? '',
    postcode: activity.postcode ? String(activity.postcode) : '',
    country: activity.country ?? 'Australia',
    location: activity.location ?? '',
    imageUrl: activity.imageUrl ?? '',
    priceLabel: activity.priceLabel ?? 'Free',
  };
}

export default function ActivitiesScreen() {
  const { state } = useOnboarding();
  const queryClient = useQueryClient();
  const colors = useColors();
  const { userId } = useAuth();
  const { isAdmin, isOrganizer, role } = useRole();
  const canCreate = isAdmin || isOrganizer || role === 'business';

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityFormState>(emptyForm(state.city, state.country || 'Australia'));

  const { data: activities = [], isLoading } = useQuery<ActivityData[]>({
    queryKey: ['/api/activities', state.country, state.city],
    queryFn: () => {
      const params: { country?: string; city?: string } = {};
      if (state.country) params.country = state.country;
      if (state.city) params.city = state.city;
      return api.activities.list(params);
    },
  });

  const refreshActivities = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => api.activities.create(toPayload(form)),
    onSuccess: async () => {
      await refreshActivities();
      setEditorOpen(false);
      setEditingId(null);
      setForm(emptyForm(state.city, state.country || 'Australia'));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create activity';
      Alert.alert('Create failed', message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error('No activity selected');
      return api.activities.update(editingId, toPayload(form));
    },
    onSuccess: async () => {
      await refreshActivities();
      setEditorOpen(false);
      setEditingId(null);
      setForm(emptyForm(state.city, state.country || 'Australia'));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update activity';
      Alert.alert('Update failed', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.activities.remove(id),
    onSuccess: refreshActivities,
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete activity';
      Alert.alert('Delete failed', message);
    },
  });

  const promoteMutation = useMutation({
    mutationFn: ({ id, isPromoted }: { id: string; isPromoted: boolean }) => api.activities.promote(id, isPromoted),
    onSuccess: refreshActivities,
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to promote activity';
      Alert.alert('Promotion failed', message);
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(state.city, state.country || 'Australia'));
    setEditorOpen(true);
  };

  const openEdit = (activity: ActivityData) => {
    setEditingId(activity.id);
    setForm(formFromActivity(activity));
    setEditorOpen(true);
  };

  const canManage = (activity: ActivityData) => isAdmin || activity.ownerId === userId;

  // Map API data to BrowseItem format
  const browseItems: BrowseItem[] = activities.map((activity) => ({
    id: activity.id,
    title: activity.name,
    subtitle: `${activity.category} | ${activity.duration}`,
    description: activity.description,
    imageUrl: activity.imageUrl,
    rating: activity.rating,
    reviews: activity.reviewsCount,
    priceLabel: activity.priceLabel,
    isPromoted: activity.isPromoted,
  }));

  // Filter promoted items
  const promotedItems = browseItems.filter((item) => item.isPromoted);

  const handleItemPress = (item: BrowseItem) => {
    router.push({ pathname: '/activities/[id]', params: { id: item.id } });
  };

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  );

  const submitEditor = () => {
    if (!form.name.trim() || !form.description.trim() || !form.category.trim()) {
      Alert.alert('Missing fields', 'Name, description, and category are required.');
      return;
    }
    if (editingId) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <BrowsePage
        title="Activities"
        accentColor={CultureTokens.saffron}
        accentIcon="fitness"
        categories={activityCategories}
        categoryKey="category"
        items={browseItems}
        isLoading={isLoading}
        promotedItems={promotedItems}
        promotedTitle="Popular Activities"
        emptyMessage="No activities in this tab yet."
        emptyIcon="fitness-outline"
        onItemPress={handleItemPress}
        renderItemExtra={(item) => {
          const activity = activityById.get(item.id);
          if (!activity || !canManage(activity)) {
            return null;
          }
          return (
            <View style={styles.actionsRow}>
              <Button size="sm" variant="outline" onPress={() => openEdit(activity)}>Edit</Button>
              <Button
                size="sm"
                variant="danger"
                onPress={() => {
                  Alert.alert('Delete activity', 'Are you sure you want to delete this activity?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(activity.id) },
                  ]);
                }}
              >
                Delete
              </Button>
              {isAdmin ? (
                <Button
                  size="sm"
                  variant={activity.isPromoted ? 'secondary' : 'gold'}
                  onPress={() => promoteMutation.mutate({ id: activity.id, isPromoted: !activity.isPromoted })}
                >
                  {activity.isPromoted ? 'Unpromote' : 'Promote'}
                </Button>
              ) : null}
            </View>
          );
        }}
      />

      {canCreate ? (
        <View style={styles.floatingCta}>
          <Button variant="gradient" onPress={openCreate} rightIcon="add">Create Activity</Button>
        </View>
      ) : null}

      <Modal visible={editorOpen} animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <ScrollView contentContainerStyle={[styles.editorContent, { backgroundColor: colors.background }]}> 
          <Input label="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <Input label="Description" value={form.description} multiline onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} />
          <Input label="Category" value={form.category} onChangeText={(value) => setForm((prev) => ({ ...prev, category: value }))} />
          <Input label="Duration" value={form.duration} onChangeText={(value) => setForm((prev) => ({ ...prev, duration: value }))} />
          <Input label="Location" value={form.location} onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))} />
          <Input label="City" value={form.city} onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))} />
          <Input label="State" value={form.state} onChangeText={(value) => setForm((prev) => ({ ...prev, state: value }))} />
          <Input label="Postcode" keyboardType="numeric" value={form.postcode} onChangeText={(value) => setForm((prev) => ({ ...prev, postcode: value }))} />
          <Input label="Country" value={form.country} onChangeText={(value) => setForm((prev) => ({ ...prev, country: value }))} />
          <Input label="Image URL" value={form.imageUrl} onChangeText={(value) => setForm((prev) => ({ ...prev, imageUrl: value }))} />
          <Input label="Price Label" value={form.priceLabel} onChangeText={(value) => setForm((prev) => ({ ...prev, priceLabel: value }))} />

          <View style={styles.editorActions}>
            <Button variant="outline" onPress={() => setEditorOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending || updateMutation.isPending} onPress={submitEditor}>
              {editingId ? 'Update Activity' : 'Create Activity'}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingCta: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  editorContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 48,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});
