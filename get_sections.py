import re

with open('app/profile/[id].tsx', 'r') as f:
    content = f.read()

# Find the start of the return statement
start_idx = content.find('return (\n    <ErrorBoundary>')

# Print up to the first few lines of the render output to get an idea
print(content[start_idx:start_idx+2000])
