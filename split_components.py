import re

with open('app/profile/[id].tsx', 'r') as f:
    content = f.read()

styles_match = re.search(r'const styles = StyleSheet.create\(\{([\s\S]*?)\}\);', content)
if styles_match:
    print("Found styles!")
else:
    print("Styles not found")
