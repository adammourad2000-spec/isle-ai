# Tourism Intelligence Platform (TIP)
## Technical Development Plan

---

**Document Type:** Engineering Specification
**Version:** 1.0
**Status:** Draft for Review

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRESENTATION TIER                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   Government    │  │    Merchant     │  │    Research     │  │   Public API    │   │
│  │   Dashboard     │  │     Portal      │  │     Portal      │  │    Gateway      │   │
│  │   (React/Next)  │  │   (React/Next)  │  │   (React/Next)  │  │   (Kong/AWS)    │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │                     │
            └─────────────────────┴──────────┬──────────┴─────────────────────┘
                                             │
┌────────────────────────────────────────────┼───────────────────────────────────────────┐
│                                    API GATEWAY                                          │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┴─────────────────────────────────────────┐ │
│  │  AWS API Gateway / Kong                                                            │ │
│  │  - Authentication (JWT/OAuth2)                                                     │ │
│  │  - Rate Limiting                                                                   │ │
│  │  - Request Validation                                                              │ │
│  │  - Usage Metering                                                                  │ │
│  └─────────────────────────────────────────┬─────────────────────────────────────────┘ │
└────────────────────────────────────────────┼───────────────────────────────────────────┘
                                             │
┌────────────────────────────────────────────┼───────────────────────────────────────────┐
│                                    SERVICE TIER                                         │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────┴────────┐  ┌──────────────┐                │
│  │   Visitor    │  │   Wealth     │  │  Analytics   │  │   Data       │                │
│  │   Profile    │  │   Scoring    │  │   Engine     │  │   Export     │                │
│  │   Service    │  │   Service    │  │   Service    │  │   Service    │                │
│  │   (Python)   │  │   (Python)   │  │   (Python)   │  │   (Python)   │                │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                 │                 │                        │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐                │
│  │   Journey    │  │   NLP/NLU    │  │   Alert      │  │   Consent    │                │
│  │   Mapping    │  │   Pipeline   │  │   Engine     │  │   Manager    │                │
│  │   Service    │  │   Service    │  │   Service    │  │   Service    │                │
│  │   (Python)   │  │   (Python)   │  │   (Python)   │  │   (Python)   │                │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘                │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
┌────────────────────────────────────────────┼───────────────────────────────────────────┐
│                                    ML/AI TIER                                           │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  ┌───┴───────────────────────────────────────┐   │
│  │      Model Training Pipeline     │  │         Model Serving Infrastructure      │   │
│  │  ┌────────────┐  ┌────────────┐  │  │  ┌────────────┐  ┌────────────┐           │   │
│  │  │  Feature   │  │   Model    │  │  │  │  Real-time │  │   Batch    │           │   │
│  │  │  Store     │  │  Registry  │  │  │  │  Inference │  │  Inference │           │   │
│  │  │  (Feast)   │  │  (MLflow)  │  │  │  │ (SageMaker)│  │  (Spark)   │           │   │
│  │  └────────────┘  └────────────┘  │  │  └────────────┘  └────────────┘           │   │
│  └──────────────────────────────────┘  └───────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
┌────────────────────────────────────────────┼───────────────────────────────────────────┐
│                                    DATA TIER                                            │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────┴────────┐  ┌──────────────┐                │
│  │  Event       │  │  Data Lake   │  │  Data        │  │  Cache       │                │
│  │  Streaming   │  │  (Delta/S3)  │  │  Warehouse   │  │  Layer       │                │
│  │  (Kafka)     │  │              │  │  (Snowflake) │  │  (Redis)     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack Specification

### 2.1 Current Stack (Isle AI)

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript | 18.x |
| Build Tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.x |
| Maps | Leaflet + React-Leaflet | 1.9.x |
| Animation | Framer Motion | 11.x |
| AI/LLM | OpenAI GPT-4 | Latest |
| State | React Context + Hooks | - |

### 2.2 Extended Stack (TIP)

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Event Streaming** | Apache Kafka (MSK) | Industry standard, high throughput |
| **Stream Processing** | Apache Flink | Low-latency, stateful processing |
| **Data Lake** | Delta Lake on S3 | ACID transactions, time travel |
| **Data Warehouse** | Snowflake | Scalable analytics, data sharing |
| **ML Platform** | AWS SageMaker | Managed training and inference |
| **Feature Store** | Feast | Open-source, flexible |
| **Model Registry** | MLflow | Experiment tracking, versioning |
| **Orchestration** | Apache Airflow | DAG-based workflow management |
| **Cache** | Redis Cluster | Sub-millisecond latency |
| **Search** | Elasticsearch | Full-text search, analytics |
| **API Gateway** | Kong / AWS API Gateway | Rate limiting, auth, metering |
| **Container Orchestration** | Kubernetes (EKS) | Scalable microservices |
| **Monitoring** | Datadog / Prometheus + Grafana | Full observability stack |
| **Secrets Management** | AWS Secrets Manager + Vault | Secure credential storage |

---

## 3. Data Pipeline Architecture

### 3.1 Event Schema Definition

```typescript
// Base Event Interface
interface TIPEvent {
  eventId: string;          // UUID v4
  eventType: string;        // Enum of event types
  timestamp: string;        // ISO 8601
  visitorHash: string;      // SHA-256 pseudonymized identifier
  sessionId: string;        // UUID v4
  source: 'CHATBOT' | 'MAP' | 'BOOKING' | 'EXTERNAL';
  version: string;          // Schema version
}

// Chat Message Event
interface ChatMessageEvent extends TIPEvent {
  eventType: 'CHAT_MESSAGE';
  payload: {
    role: 'USER' | 'ASSISTANT';
    content: string;                    // Raw message (PII tokenized)
    contentTokenized: string;           // With PII replaced
    languageDetected: string;           // ISO 639-1 code
    intentClassification: {
      primary: string;
      secondary: string[];
      confidence: number;
    };
    entitiesExtracted: Array<{
      type: string;
      value: string;
      confidence: number;
      position: [number, number];
    }>;
    sentimentScore: number;             // -1.0 to 1.0
    wealthSignals: Array<{
      signalType: string;
      signalValue: number;
      evidence: string;
    }>;
  };
}

// Map Interaction Event
interface MapInteractionEvent extends TIPEvent {
  eventType: 'MAP_INTERACTION';
  payload: {
    actionType: 'VIEW' | 'CLICK' | 'FILTER' | 'SEARCH' | 'DIRECTIONS';
    placeId?: string;
    placeCategory?: string;
    placePriceRange?: string;
    zoomLevel: number;
    viewportBounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    duration: number;                   // Milliseconds
  };
}

// Wealth Signal Event (Derived)
interface WealthSignalEvent extends TIPEvent {
  eventType: 'WEALTH_SIGNAL';
  payload: {
    signalCategory: 'LEXICAL' | 'BEHAVIORAL' | 'TRANSACTIONAL' | 'CONTEXTUAL';
    signalName: string;
    signalStrength: number;             // 0.0 to 1.0
    evidence: string;                   // Anonymized excerpt
    modelVersion: string;
    contributesToScore: boolean;
  };
}

// Profile Update Event (Derived)
interface ProfileUpdateEvent extends TIPEvent {
  eventType: 'PROFILE_UPDATE';
  payload: {
    previousScore: number;
    newScore: number;
    previousClassification: string;
    newClassification: string;
    triggerSignals: string[];
    confidenceChange: number;
  };
}
```

### 3.2 Kafka Topic Structure

```yaml
topics:
  # Raw Events (High Volume)
  - name: tip.events.raw.chatbot
    partitions: 12
    replication: 3
    retention: 7d

  - name: tip.events.raw.map
    partitions: 6
    replication: 3
    retention: 7d

  - name: tip.events.raw.external
    partitions: 3
    replication: 3
    retention: 7d

  # Processed Events
  - name: tip.events.processed.signals
    partitions: 6
    replication: 3
    retention: 30d

  - name: tip.events.processed.profiles
    partitions: 6
    replication: 3
    retention: 90d

  # Derived Analytics
  - name: tip.analytics.realtime
    partitions: 3
    replication: 3
    retention: 1d

  # Alerts
  - name: tip.alerts.high-value
    partitions: 1
    replication: 3
    retention: 7d
```

### 3.3 Flink Processing Jobs

```python
# Wealth Signal Detection Job
class WealthSignalDetectionJob:
    """
    Real-time wealth signal detection from chat messages.
    """

    def __init__(self):
        self.model = WealthPropensityModel.load("s3://tip-models/wpm/latest")
        self.feature_extractor = FeatureExtractor()

    def process(self, message_event: ChatMessageEvent) -> List[WealthSignalEvent]:
        # Extract features
        features = self.feature_extractor.extract(message_event)

        # Detect signals
        signals = self.model.detect_signals(features)

        # Create signal events
        return [
            WealthSignalEvent(
                eventId=str(uuid4()),
                eventType='WEALTH_SIGNAL',
                timestamp=datetime.utcnow().isoformat(),
                visitorHash=message_event.visitorHash,
                sessionId=message_event.sessionId,
                source='CHATBOT',
                version='1.0',
                payload={
                    'signalCategory': signal.category,
                    'signalName': signal.name,
                    'signalStrength': signal.strength,
                    'evidence': signal.evidence[:200],  # Truncated
                    'modelVersion': self.model.version,
                    'contributesToScore': signal.strength > 0.5
                }
            )
            for signal in signals
        ]


# Profile Aggregation Job
class ProfileAggregationJob:
    """
    Maintains running visitor profiles with wealth scores.
    Uses Flink's stateful processing with RocksDB backend.
    """

    def __init__(self):
        self.score_calculator = WealthScoreCalculator()

    def process(
        self,
        signal_event: WealthSignalEvent,
        current_profile: VisitorProfile
    ) -> Tuple[VisitorProfile, Optional[ProfileUpdateEvent]]:

        # Add signal to profile history
        current_profile.add_signal(signal_event)

        # Recalculate wealth score
        old_score = current_profile.wealth_score
        old_classification = current_profile.wealth_classification

        new_score = self.score_calculator.calculate(current_profile)
        new_classification = self.classify(new_score)

        current_profile.wealth_score = new_score
        current_profile.wealth_classification = new_classification
        current_profile.last_updated = datetime.utcnow()

        # Generate update event if significant change
        if abs(new_score - old_score) > 0.1 or new_classification != old_classification:
            update_event = ProfileUpdateEvent(
                eventId=str(uuid4()),
                eventType='PROFILE_UPDATE',
                timestamp=datetime.utcnow().isoformat(),
                visitorHash=signal_event.visitorHash,
                sessionId=signal_event.sessionId,
                source='CHATBOT',
                version='1.0',
                payload={
                    'previousScore': old_score,
                    'newScore': new_score,
                    'previousClassification': old_classification,
                    'newClassification': new_classification,
                    'triggerSignals': [signal_event.payload['signalName']],
                    'confidenceChange': current_profile.confidence - current_profile.previous_confidence
                }
            )
            return current_profile, update_event

        return current_profile, None

    def classify(self, score: float) -> str:
        if score >= 0.85:
            return 'UHNWI'
        elif score >= 0.65:
            return 'HNWI'
        elif score >= 0.40:
            return 'AFFLUENT'
        elif score >= 0.20:
            return 'MASS_AFFLUENT'
        else:
            return 'UNKNOWN'
```

---

## 4. ML/AI Model Specifications

### 4.1 Wealth Propensity Model (WPM)

#### 4.1.1 Model Architecture

```python
import torch
import torch.nn as nn
from transformers import AutoModel, AutoTokenizer

class WealthPropensityModel(nn.Module):
    """
    Multi-modal wealth propensity prediction model.

    Combines:
    - Transformer-based text encoding (fine-tuned)
    - Behavioral feature encoding
    - Attention-based signal fusion
    """

    def __init__(
        self,
        base_model: str = "sentence-transformers/all-mpnet-base-v2",
        num_behavioral_features: int = 50,
        num_wealth_classes: int = 5,
        hidden_dim: int = 512,
        dropout: float = 0.3
    ):
        super().__init__()

        # Text encoder (fine-tuned transformer)
        self.text_encoder = AutoModel.from_pretrained(base_model)
        self.text_tokenizer = AutoTokenizer.from_pretrained(base_model)
        text_dim = self.text_encoder.config.hidden_size  # 768

        # Behavioral feature encoder
        self.behavioral_encoder = nn.Sequential(
            nn.Linear(num_behavioral_features, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU()
        )

        # Multi-head attention for feature fusion
        self.fusion_attention = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=8,
            dropout=dropout,
            batch_first=True
        )

        # Text projection to match behavioral dimension
        self.text_projection = nn.Linear(text_dim, hidden_dim)

        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_wealth_classes)
        )

        # Signal extraction heads (multi-task learning)
        self.signal_heads = nn.ModuleDict({
            'lexical': nn.Linear(hidden_dim, 10),      # 10 lexical signal types
            'behavioral': nn.Linear(hidden_dim, 8),    # 8 behavioral signal types
            'transactional': nn.Linear(hidden_dim, 6), # 6 transactional signal types
        })

    def forward(
        self,
        text_input: torch.Tensor,          # Tokenized conversation
        attention_mask: torch.Tensor,
        behavioral_features: torch.Tensor   # [batch, num_features]
    ) -> dict:

        # Encode text
        text_output = self.text_encoder(
            input_ids=text_input,
            attention_mask=attention_mask
        )
        text_embedding = text_output.last_hidden_state[:, 0, :]  # [CLS] token
        text_projected = self.text_projection(text_embedding)

        # Encode behavioral features
        behavioral_embedding = self.behavioral_encoder(behavioral_features)

        # Fuse with attention
        combined = torch.stack([text_projected, behavioral_embedding], dim=1)
        fused, attention_weights = self.fusion_attention(
            combined, combined, combined
        )
        fused_pooled = fused.mean(dim=1)

        # Concatenate for classification
        final_representation = torch.cat([
            fused_pooled,
            text_projected  # Skip connection
        ], dim=-1)

        # Classification
        wealth_logits = self.classifier(final_representation)

        # Signal extraction (auxiliary tasks)
        signals = {
            name: head(fused_pooled)
            for name, head in self.signal_heads.items()
        }

        return {
            'wealth_logits': wealth_logits,
            'wealth_probs': torch.softmax(wealth_logits, dim=-1),
            'signals': signals,
            'attention_weights': attention_weights,
            'embedding': fused_pooled
        }
```

#### 4.1.2 Training Configuration

```yaml
# training_config.yaml
model:
  name: "WealthPropensityModel"
  version: "1.0.0"
  base_model: "sentence-transformers/all-mpnet-base-v2"

training:
  epochs: 50
  batch_size: 32
  learning_rate: 2e-5
  warmup_steps: 1000
  weight_decay: 0.01
  gradient_accumulation_steps: 4
  fp16: true

  # Multi-task loss weights
  loss_weights:
    wealth_classification: 1.0
    lexical_signals: 0.3
    behavioral_signals: 0.3
    transactional_signals: 0.3

  # Class weights for imbalanced data
  class_weights:
    UNKNOWN: 0.5
    MASS_AFFLUENT: 0.8
    AFFLUENT: 1.0
    HNWI: 2.0
    UHNWI: 3.0

data:
  train_path: "s3://tip-data/training/train.parquet"
  val_path: "s3://tip-data/training/val.parquet"
  test_path: "s3://tip-data/training/test.parquet"

  # Augmentation
  augmentation:
    synonym_replacement: 0.1
    random_deletion: 0.05
    back_translation: true
    back_translation_languages: ["fr", "de", "es"]

evaluation:
  metrics:
    - accuracy
    - f1_macro
    - f1_weighted
    - precision_per_class
    - recall_per_class
    - auc_roc
    - confusion_matrix

  # Fairness metrics
  fairness:
    protected_attributes: ["detected_nationality", "detected_language"]
    metrics: ["demographic_parity", "equalized_odds"]

mlflow:
  tracking_uri: "s3://tip-mlflow/tracking"
  experiment_name: "wpm_training"
  artifact_location: "s3://tip-mlflow/artifacts"
```

#### 4.1.3 Feature Engineering

```python
class FeatureExtractor:
    """
    Extracts features from conversation data for wealth prediction.
    """

    # Lexical features
    LUXURY_VOCABULARY = {
        'high_signal': [
            'private', 'exclusive', 'bespoke', 'concierge', 'charter',
            'villa', 'penthouse', 'yacht', 'helicopter', 'chauffeur',
            'sommelier', 'michelin', 'butler', 'portfolio', 'investment'
        ],
        'medium_signal': [
            'luxury', 'premium', 'suite', 'spa', 'golf', 'fine dining',
            'boutique', 'reservation', 'vip', 'upgrade'
        ],
        'negative_signal': [
            'budget', 'cheap', 'discount', 'deal', 'affordable',
            'hostel', 'backpack', 'free', 'coupon'
        ]
    }

    def extract_lexical_features(self, text: str) -> dict:
        text_lower = text.lower()
        words = text_lower.split()

        return {
            'luxury_word_density_high': sum(
                1 for w in words if w in self.LUXURY_VOCABULARY['high_signal']
            ) / max(len(words), 1),
            'luxury_word_density_medium': sum(
                1 for w in words if w in self.LUXURY_VOCABULARY['medium_signal']
            ) / max(len(words), 1),
            'budget_word_density': sum(
                1 for w in words if w in self.LUXURY_VOCABULARY['negative_signal']
            ) / max(len(words), 1),
            'avg_word_length': sum(len(w) for w in words) / max(len(words), 1),
            'sentence_complexity': len(text.split('.')) / max(len(words), 1),
            'question_ratio': text.count('?') / max(len(text.split('.')), 1),
        }

    def extract_behavioral_features(self, session_data: dict) -> dict:
        return {
            'session_duration_minutes': session_data.get('duration', 0) / 60,
            'messages_per_session': session_data.get('message_count', 0),
            'avg_message_length': session_data.get('avg_message_length', 0),
            'map_interactions': session_data.get('map_clicks', 0),
            'luxury_category_views': session_data.get('luxury_views', 0),
            'price_filter_max': session_data.get('max_price_filter', 0),
            'booking_attempts': session_data.get('booking_clicks', 0),
            'return_visitor': int(session_data.get('previous_sessions', 0) > 0),
            'time_of_day_score': self._time_wealth_score(session_data.get('hour', 12)),
            'device_score': self._device_wealth_score(session_data.get('device', 'unknown')),
        }

    def extract_transactional_features(self, inquiry_data: dict) -> dict:
        return {
            'avg_price_tier_inquired': inquiry_data.get('avg_price_tier', 2),
            'max_price_mentioned': inquiry_data.get('max_price', 0),
            'group_size': inquiry_data.get('group_size', 2),
            'trip_duration_days': inquiry_data.get('trip_duration', 3),
            'advance_booking_days': inquiry_data.get('advance_days', 30),
            'multi_island_interest': int(inquiry_data.get('islands', 1) > 1),
        }

    def _time_wealth_score(self, hour: int) -> float:
        # HNWIs often browse during business hours or late evening
        if 9 <= hour <= 17:  # Business hours
            return 0.7
        elif 21 <= hour <= 23:  # Late evening
            return 0.8
        else:
            return 0.5

    def _device_wealth_score(self, device: str) -> float:
        scores = {
            'iphone_pro': 0.8,
            'iphone': 0.6,
            'ipad_pro': 0.9,
            'macbook': 0.7,
            'android_premium': 0.6,
            'android': 0.4,
            'windows': 0.5,
            'unknown': 0.5
        }
        return scores.get(device.lower(), 0.5)
```

---

## 5. API Specifications

### 5.1 Internal APIs

```yaml
openapi: 3.0.3
info:
  title: Tourism Intelligence Platform - Internal API
  version: 1.0.0
  description: Internal APIs for TIP microservices

paths:
  /api/v1/visitors/{visitorHash}/profile:
    get:
      summary: Get visitor profile
      parameters:
        - name: visitorHash
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Visitor profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VisitorProfile'

  /api/v1/visitors/{visitorHash}/signals:
    get:
      summary: Get wealth signals for visitor
      parameters:
        - name: visitorHash
          in: path
          required: true
          schema:
            type: string
        - name: since
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: List of wealth signals
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/WealthSignal'

  /api/v1/analytics/cohorts:
    get:
      summary: Get cohort analytics
      parameters:
        - name: classification
          in: query
          schema:
            type: string
            enum: [UNKNOWN, MASS_AFFLUENT, AFFLUENT, HNWI, UHNWI]
        - name: dateFrom
          in: query
          schema:
            type: string
            format: date
        - name: dateTo
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Cohort analytics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CohortAnalytics'

  /api/v1/predictions/spending:
    post:
      summary: Predict spending for visitor segment
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                classification:
                  type: string
                tripDuration:
                  type: integer
                interests:
                  type: array
                  items:
                    type: string
      responses:
        '200':
          description: Spending prediction
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SpendingPrediction'

components:
  schemas:
    VisitorProfile:
      type: object
      properties:
        visitorHash:
          type: string
        firstSeen:
          type: string
          format: date-time
        lastSeen:
          type: string
          format: date-time
        sessionCount:
          type: integer
        wealthScore:
          type: number
          minimum: 0
          maximum: 1
        wealthClassification:
          type: string
          enum: [UNKNOWN, MASS_AFFLUENT, AFFLUENT, HNWI, UHNWI]
        confidence:
          type: number
        primaryInterests:
          type: array
          items:
            type: string
        predictedSpendingTier:
          type: string
        investmentIntentScore:
          type: number
        consentLevel:
          type: string
          enum: [ESSENTIAL, ANALYTICS, PERSONALIZATION, FULL]

    WealthSignal:
      type: object
      properties:
        signalId:
          type: string
        signalType:
          type: string
        signalName:
          type: string
        signalValue:
          type: number
        evidence:
          type: string
        detectedAt:
          type: string
          format: date-time
        modelVersion:
          type: string

    CohortAnalytics:
      type: object
      properties:
        cohort:
          type: string
        period:
          type: object
          properties:
            from:
              type: string
              format: date
            to:
              type: string
              format: date
        metrics:
          type: object
          properties:
            visitorCount:
              type: integer
            avgWealthScore:
              type: number
            avgSessionDuration:
              type: number
            topInterests:
              type: array
              items:
                type: string
            conversionRate:
              type: number
            predictedTotalSpending:
              type: number
```

### 5.2 External APIs (Merchant Data Products)

```yaml
openapi: 3.0.3
info:
  title: Tourism Intelligence Platform - Merchant API
  version: 1.0.0
  description: APIs for merchant data products (aggregated, anonymized)

paths:
  /api/merchant/v1/demand/realtime:
    get:
      summary: Get real-time demand signals
      security:
        - merchantApiKey: []
      parameters:
        - name: category
          in: query
          schema:
            type: string
            enum: [hotel, restaurant, activity, transport]
        - name: priceRange
          in: query
          schema:
            type: string
            enum: [budget, mid, premium, luxury]
      responses:
        '200':
          description: Aggregated demand signals
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DemandSignal'

  /api/merchant/v1/insights/weekly:
    get:
      summary: Get weekly market insights
      security:
        - merchantApiKey: []
      responses:
        '200':
          description: Weekly insights report
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WeeklyInsights'

  /api/merchant/v1/predictions/demand:
    get:
      summary: Get demand forecast
      security:
        - merchantApiKey: []
      parameters:
        - name: horizon
          in: query
          schema:
            type: string
            enum: [7d, 14d, 30d]
      responses:
        '200':
          description: Demand forecast
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DemandForecast'

components:
  securitySchemes:
    merchantApiKey:
      type: apiKey
      in: header
      name: X-Merchant-API-Key

  schemas:
    DemandSignal:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        category:
          type: string
        demandIndex:
          type: number
          description: Normalized demand index (0-100)
        trend:
          type: string
          enum: [rising, stable, falling]
        topSearchTerms:
          type: array
          items:
            type: string
        cohortBreakdown:
          type: object
          description: Percentage by wealth cohort (k-anonymized)
```

---

## 6. Infrastructure as Code

### 6.1 Terraform Module Structure

```hcl
# main.tf - Root module

module "networking" {
  source = "./modules/networking"

  vpc_cidr           = var.vpc_cidr
  environment        = var.environment
  availability_zones = var.availability_zones
}

module "data_lake" {
  source = "./modules/data-lake"

  environment     = var.environment
  s3_bucket_name  = "tip-data-lake-${var.environment}"
  kms_key_arn     = module.security.kms_key_arn
}

module "kafka" {
  source = "./modules/kafka"

  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  instance_type      = "kafka.m5.large"
  number_of_brokers  = 3
  ebs_volume_size    = 500
}

module "eks" {
  source = "./modules/eks"

  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.private_subnet_ids
  cluster_version     = "1.29"
  node_instance_types = ["m5.xlarge", "m5.2xlarge"]
  min_nodes           = 3
  max_nodes           = 20
}

module "sagemaker" {
  source = "./modules/sagemaker"

  environment    = var.environment
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
  instance_type  = "ml.g4dn.xlarge"
}

module "monitoring" {
  source = "./modules/monitoring"

  environment = var.environment
  eks_cluster = module.eks.cluster_name
  alert_email = var.alert_email
}

module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
}
```

### 6.2 Kubernetes Deployments

```yaml
# deployment-nlp-pipeline.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nlp-pipeline
  namespace: tip-services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nlp-pipeline
  template:
    metadata:
      labels:
        app: nlp-pipeline
    spec:
      containers:
      - name: nlp-pipeline
        image: tip-registry/nlp-pipeline:latest
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: "1"
          limits:
            memory: "8Gi"
            cpu: "4"
            nvidia.com/gpu: "1"
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          valueFrom:
            secretKeyRef:
              name: kafka-credentials
              key: bootstrap-servers
        - name: MODEL_PATH
          value: "s3://tip-models/wpm/latest"
        - name: LOG_LEVEL
          value: "INFO"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
      nodeSelector:
        node-type: gpu
      tolerations:
      - key: "nvidia.com/gpu"
        operator: "Exists"
        effect: "NoSchedule"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nlp-pipeline-hpa
  namespace: tip-services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nlp-pipeline
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: kafka_consumer_lag
      target:
        type: AverageValue
        averageValue: "1000"
```

---

## 7. Security & Compliance

### 7.1 Data Classification

| Level | Description | Examples | Controls |
|-------|-------------|----------|----------|
| **Public** | No restrictions | Aggregated statistics | None |
| **Internal** | Business use only | Cohort analytics | Access logging |
| **Confidential** | Need-to-know basis | Individual profiles | Encryption, MFA |
| **Restricted** | Regulatory/legal | Re-identification keys | HSM, audit trail |

### 7.2 Encryption Standards

```yaml
encryption:
  at_rest:
    algorithm: AES-256-GCM
    key_management: AWS KMS
    key_rotation: 90 days

  in_transit:
    protocol: TLS 1.3
    cipher_suites:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256

  pii_tokenization:
    algorithm: Format-Preserving Encryption (FF1)
    token_vault: Isolated secure enclave
```

### 7.3 Access Control Matrix

| Role | Profiles | Signals | Analytics | Raw Data | Admin |
|------|----------|---------|-----------|----------|-------|
| Gov Admin | Full | Full | Full | Audit only | Full |
| Gov Analyst | Anonymized | Aggregated | Full | None | None |
| Merchant Basic | None | None | Limited | None | None |
| Merchant Premium | None | None | Full | None | None |
| System Service | Full | Full | Full | Full | Config only |

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  10%
                    │   Tests     │
                    ├─────────────┤
                    │ Integration │  20%
                    │   Tests     │
            ┌───────┴─────────────┴───────┐
            │       Unit Tests            │  70%
            └─────────────────────────────┘
```

### 8.2 ML Model Testing

```python
# tests/test_wealth_model.py
import pytest
from tip.models import WealthPropensityModel
from tip.testing import ModelTestSuite

class TestWealthPropensityModel:

    @pytest.fixture
    def model(self):
        return WealthPropensityModel.load("tests/fixtures/model_v1")

    @pytest.fixture
    def test_data(self):
        return ModelTestSuite.load_test_cases("tests/fixtures/test_cases.json")

    def test_classification_accuracy(self, model, test_data):
        """Model should achieve >70% accuracy on test set."""
        predictions = model.predict_batch(test_data.features)
        accuracy = (predictions == test_data.labels).mean()
        assert accuracy > 0.70

    def test_fairness_demographic_parity(self, model, test_data):
        """Model should not discriminate by nationality."""
        for nationality in test_data.nationalities:
            subset = test_data.filter(nationality=nationality)
            hnwi_rate = (model.predict_batch(subset.features) >= 3).mean()
            # Rate should be within 10% of overall rate
            assert abs(hnwi_rate - test_data.overall_hnwi_rate) < 0.10

    def test_signal_consistency(self, model, test_data):
        """Luxury vocabulary should increase HNWI probability."""
        base_text = "I'm looking for a place to stay"
        luxury_text = "I'm looking for an exclusive private villa with butler service"

        base_score = model.predict(base_text)['wealth_probs'][3]  # HNWI prob
        luxury_score = model.predict(luxury_text)['wealth_probs'][3]

        assert luxury_score > base_score

    def test_inference_latency(self, model):
        """Inference should complete in <100ms."""
        import time

        text = "What are the best restaurants in George Town?"

        start = time.time()
        for _ in range(100):
            model.predict(text)
        elapsed = (time.time() - start) / 100

        assert elapsed < 0.100  # 100ms
```

---

## 9. Deployment & Operations

### 9.1 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: TIP Deployment Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: pytest tests/unit --cov=tip
      - name: Run integration tests
        run: pytest tests/integration
      - name: Run ML model tests
        run: pytest tests/ml
      - name: Security scan
        run: trivy fs --security-checks vuln,config .

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: docker-compose build
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker-compose push

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          kubectl config use-context staging
          helmfile -e staging apply

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production (canary)
        run: |
          kubectl config use-context production
          helmfile -e production apply --set canary.enabled=true
      - name: Run smoke tests
        run: pytest tests/smoke --environment=production
      - name: Promote canary
        run: |
          helmfile -e production apply --set canary.weight=100
```

### 9.2 Monitoring & Alerting

```yaml
# monitoring/alerts.yaml
groups:
  - name: tip-critical
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: ModelInferenceLatency
        expr: |
          histogram_quantile(0.95, rate(model_inference_duration_seconds_bucket[5m])) > 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Model inference latency exceeds 200ms (p95)"

      - alert: KafkaConsumerLag
        expr: kafka_consumer_group_lag > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka consumer lag exceeds 10k messages"

      - alert: DataQualityDegradation
        expr: |
          tip_profile_confidence_avg < 0.6
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Average profile confidence below threshold"
```

---

## 10. Timeline & Milestones

### Phase 1: Foundation (Months 1-6)

| Month | Milestone | Deliverables |
|-------|-----------|--------------|
| 1 | Infrastructure Setup | VPC, IAM, base Terraform |
| 2 | Data Lake MVP | S3, Delta Lake, schemas |
| 3 | Event Pipeline | Kafka, basic producers |
| 4 | Isle AI Integration | Logging, event emission |
| 5 | Privacy Framework | Consent, pseudonymization |
| 6 | Phase 1 Review | Security audit, documentation |

### Phase 2: Intelligence (Months 7-15)

| Month | Milestone | Deliverables |
|-------|-----------|--------------|
| 7-8 | ML Training Pipeline | Feature store, training infra |
| 9-10 | WPM v1.0 | Trained model, benchmarks |
| 11-12 | Real-time Inference | Flink jobs, SageMaker endpoints |
| 13-14 | Government Dashboard | Analytics UI, KPIs |
| 15 | Phase 2 Review | Model audit, user testing |

### Phase 3: Ecosystem (Months 16-27)

| Month | Milestone | Deliverables |
|-------|-----------|--------------|
| 16-18 | Merchant Portal | API, self-service UI |
| 19-21 | Data Products | Insights packages, pricing |
| 22-24 | External Integrations | Immigration, hospitality |
| 25-27 | Scale & Optimize | Performance tuning, expansion |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **HNWI** | High Net Worth Individual ($1M-$30M net worth) |
| **UHNWI** | Ultra High Net Worth Individual ($30M+ net worth) |
| **WPM** | Wealth Propensity Model |
| **TIP** | Tourism Intelligence Platform |
| **PII** | Personally Identifiable Information |
| **k-anonymity** | Privacy model ensuring each record is indistinguishable from k-1 others |

---

## Appendix B: References

1. AWS Well-Architected Framework
2. Google Cloud ML Best Practices
3. NIST AI Risk Management Framework
4. ISO/IEC 27001:2022 Information Security
5. GDPR Technical Implementation Guidelines

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2026 | TIP Engineering Team | Initial release |

