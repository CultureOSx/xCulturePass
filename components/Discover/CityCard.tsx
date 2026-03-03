import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

const CITY_IMAGES: Record<string, string> = {
  // Australian metro areas (used by default in FEATURED_CITIES)
  'Sydney': 'https://images.pexels.com/photos/995764/pexels-photo-995764.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Melbourne': 'https://images.pexels.com/photos/302827/pexels-photo-302827.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Brisbane': 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Perth': 'https://images.pexels.com/photos/208817/pexels-photo-208817.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Adelaide': 'https://images.pexels.com/photos/161722/pexels-photo-161722.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Gold Coast': 'https://images.pexels.com/photos/204790/pexels-photo-204790.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Canberra': 'https://images.pexels.com/photos/1051681/pexels-photo-1051681.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Darwin': 'https://images.pexels.com/photos/442112/pexels-photo-442112.jpeg?auto=compress&cs=tinysrgb&w=1200',
  // international fallback set (still useful for future expansion)
  'Auckland': 'https://images.pexels.com/photos/315793/pexels-photo-315793.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Dubai': 'https://images.pexels.com/photos/3787839/pexels-photo-3787839.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'London': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Toronto': 'https://images.pexels.com/photos/374870/pexels-photo-374870.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Vancouver': 'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=1200',
};

const CITY_FALLBACK_IMAGES: Record<string, string> = {
  'Toronto': 'https://images.pexels.com/photos/1781629/pexels-photo-1781629.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'Vancouver': 'https://images.pexels.com/photos/264112/pexels-photo-264112.jpeg?auto=compress&cs=tinysrgb&w=1200',
};

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/2566242/pexels-photo-2566242.jpeg?auto=compress&cs=tinysrgb&w=1200';

interface CityCardProps {
  city: {
    name: string;
    country: string;
    imageUrl?: string;
  };
  onPress?: () => void;
  width?: number;
}

function CityCard({ city, onPress, width }: CityCardProps) {
  const colors = useColors();
  const cityPrimaryImage = city.imageUrl || CITY_IMAGES[city.name] || FALLBACK_IMAGE;
  const cityFallbackImage = CITY_FALLBACK_IMAGES[city.name];
  const [imageUri, setImageUri] = useState(cityPrimaryImage);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceSecondary },
        width ? { width } : null,
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        Platform.OS === 'web' && { cursor: 'pointer' as any },
        Colors.shadows.medium,
      ]}
      onPress={onPress}
      accessibilityLabel={`Explore ${city.name}, ${city.country}`}
    >
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        onError={() => {
          if (cityFallbackImage && imageUri !== cityFallbackImage && imageUri !== FALLBACK_IMAGE) {
            setImageUri(cityFallbackImage);
            return;
          }
          if (imageUri !== FALLBACK_IMAGE) setImageUri(FALLBACK_IMAGE);
        }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>
        <Text style={styles.cityName}>{city.name}</Text>
        <Text style={styles.country}>{city.country}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    height: 130,
    borderRadius: 20,
    overflow: 'hidden',
    // backgroundColor applied inline
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  cityName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    // color inline
  },
  country: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginTop: 1,
    // color inline
  },
});

// ⚡ Bolt Optimization: Added React.memo() to prevent unnecessary re-renders in lists
export default React.memo(CityCard);
