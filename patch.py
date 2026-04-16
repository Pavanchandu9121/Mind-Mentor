import os
files = [r'd:\Capstone\emotion-analysis-service\app.py', r'd:\Capstone\ai-prediction-service\app.py']
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('❌', 'Error').replace('✓', 'OK').replace('→', '->').replace('—', '-')
    content = content.replace('from fer import FER', 'from fer.fer import FER')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Patch applied successfully')
