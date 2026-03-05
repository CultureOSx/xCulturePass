import { StyleSheet } from 'react-native';
import { shadows } from '@/constants/theme';

export function getStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    errorText: {
      color: colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 24,
      fontFamily: 'Poppins_600SemiBold',
    },
    backLink: {
      color: colors.primary,
      fontSize: 15,
      textAlign: 'center',
      marginTop: 12,
      textDecorationLine: 'underline',
      fontFamily: 'Poppins_500Medium',
    },
  });
}

export function getModalStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    handle: {
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textTertiary,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Poppins_700Bold',
      color: colors.text,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    sectionLabel: {
      fontSize: 13,
      fontFamily: 'Poppins_600SemiBold',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
  });
}
