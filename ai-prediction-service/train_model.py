"""
Train a Logistic Regression model for mental health risk prediction.
Uses synthetic data based on PHQ-9 and GAD-7 score distributions.
"""
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

np.random.seed(42)

def generate_training_data(n_samples=3000):
    """Generate synthetic training data from PHQ-9 and GAD-7 score ranges."""
    X = []
    y = []

    # Low risk: PHQ-9 (0-9), GAD-7 (0-9)
    for _ in range(n_samples // 3):
        phq9 = np.random.randint(0, 10)
        gad7 = np.random.randint(0, 10)
        X.append([phq9, gad7])
        y.append(0)  # Low

    # Moderate risk: PHQ-9 (10-19), GAD-7 (10-14)
    for _ in range(n_samples // 3):
        phq9 = np.random.randint(8, 20)
        gad7 = np.random.randint(7, 16)
        X.append([phq9, gad7])
        y.append(1)  # Moderate

    # High risk: PHQ-9 (15-27), GAD-7 (10-21)
    for _ in range(n_samples // 3):
        phq9 = np.random.randint(14, 28)
        gad7 = np.random.randint(10, 22)
        X.append([phq9, gad7])
        y.append(2)  # High

    return np.array(X), np.array(y)

def train_model():
    print("Generating training data...")
    X, y = generate_training_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")

    model = LogisticRegression(
        multi_class='multinomial',
        solver='lbfgs',
        max_iter=1000,
        random_state=42
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=['Low', 'Moderate', 'High']
    ))

    model_path = os.path.join(os.path.dirname(__file__), 'model.joblib')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

    return model

if __name__ == '__main__':
    train_model()
