const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStyles = `  webSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  webSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  webSectionAccentBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  webSectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#EAEEFF',
    letterSpacing: -0.3,
  },
  webSectionSub: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#7A88AA',
  },`;

const newStyles = `  webSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  webSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  webSectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  webSectionSub: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#94A2C4',
  },`;

if (content.includes(oldStyles)) {
  content = content.replace(oldStyles, newStyles);
  fs.writeFileSync(file, content);
  console.log("WebSectionHeader styles successfully updated.");
} else {
  console.log("Could not find original WebSectionHeader styles.");
}
