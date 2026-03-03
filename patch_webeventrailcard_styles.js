const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStyles = `  webRailCard: {
    width: 250,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#12151F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  webRailImage: {
    width: '100%',
    height: '100%',
  },
  webRailDateChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#A78BFA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  webRailDateChipText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  webRailCatTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    maxWidth: 100,
  },
  webRailCatText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  webRailMeta: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 4,
  },
  webRailTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  webRailVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  webRailVenue: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  webRailBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  webRailPricePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  webRailPriceText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },`;

const newStyles = `  webRailCard: {
    width: 250,
    backgroundColor: '#1C1F2B',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  webRailImageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#2A2D3A',
  },
  webRailImage: {
    width: '100%',
    height: '100%',
  },
  webRailCatTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 100,
  },
  webRailCatText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  webRailMeta: {
    padding: 12,
    gap: 4,
  },
  webRailDateText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#EE334E',
    textTransform: 'uppercase',
  },
  webRailTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  webRailVenue: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#94A2C4',
    marginTop: 2,
  },
  webRailBottom: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webRailPriceTextDark: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },`;

if (content.includes(oldStyles)) {
  content = content.replace(oldStyles, newStyles);
  fs.writeFileSync(file, content);
  console.log("WebEventRailCard styles successfully updated.");
} else {
  console.log("Could not find original WebEventRailCard styles.");
}
