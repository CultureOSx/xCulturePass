const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStyles = `  webTopRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  webLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  webLocationText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#C7D2EE',
  },
  webGreeting: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#E8EEFA',
  },
  webHeading: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 42,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    maxWidth: 560,
  },
  webTopActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    alignItems: 'center',
  },
  webIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  webAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0081C8',
    overflow: 'hidden',
  },
  webAvatarText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  webSearchWrap: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  webSearchInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },`;

const newStyles = `  webTopRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 24,
  },
  webTopRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webBrandName: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  webSearchWrap: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    maxWidth: 600,
  },
  webSearchInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  webTopActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  webLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  webLocationTextBtn: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#C7D2EE',
  },
  webIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  webAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EE334E',
    overflow: 'hidden',
  },
  webAvatarText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },`;

if (content.includes(oldStyles)) {
  content = content.replace(oldStyles, newStyles);
  fs.writeFileSync(file, content);
  console.log("Web header styles successfully updated.");
} else {
  console.log("Could not find original Web header styles.");
}
