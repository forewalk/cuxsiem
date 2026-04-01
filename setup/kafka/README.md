# setup/kafka/

Apache Kafka (KRaft 모드) 설치 및 설정 가이드.
ZooKeeper 없이 KRaft 모드로 운영.

---

## 서버 환경

- 호스트명: `pipeline`
- IP: `172.16.4.75` (환경에 맞게 변경)
- 데이터 경로: `/data/kafka`
- 실행 사용자: `cruxsiem`

---

## 주요 설정값 (`server.properties`)

```properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@pipeline:9093
listeners=PLAINTEXT://pipeline:9092,CONTROLLER://pipeline:9093
advertised.listeners=PLAINTEXT://<KAFKA_IP>:9092
log.dirs=/data/kafka
log.retention.hours=24
log.retention.bytes=1073741824    # 1GB
num.partitions=3
```

> 실제 설정 파일 위치: `setup/OPA/kafka/server.properties`

---

## KRaft 초기화 (최초 1회)

```bash
KAFKA_HOME=/core/kafka

# Cluster UUID 생성
KAFKA_CLUSTER_ID=$($KAFKA_HOME/bin/kafka-storage.sh random-uuid)

# Storage 포맷
$KAFKA_HOME/bin/kafka-storage.sh format \
  -t $KAFKA_CLUSTER_ID \
  -c $KAFKA_HOME/config/kraft/server.properties
```

---

## 토픽 생성

```bash
KAFKA="pipeline:9092"

for TOPIC in threats agents edg heartbeat; do
  $KAFKA_HOME/bin/kafka-topics.sh \
    --create \
    --bootstrap-server $KAFKA \
    --replication-factor 1 \
    --partitions 3 \
    --topic $TOPIC \
    --if-not-exists
done
```

---

## systemd 서비스 등록

```bash
cp setup/OPA/vector/systemd/user/kafka.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable kafka
systemctl --user start kafka
```

> systemd 서비스 파일 위치: `setup/OPA/vector/systemd/user/kafka.service`

---

## 서비스 시작·중지 스크립트 (`kafka.sh`)

```bash
#!/bin/bash
KAFKA_HOME=/core/kafka
PID_FILE=/core/kafka/kafka.pid

case "$1" in
  start)
    $KAFKA_HOME/bin/kafka-server-start.sh -daemon \
      $KAFKA_HOME/config/kraft/server.properties
    echo $! > $PID_FILE
    ;;
  stop)
    $KAFKA_HOME/bin/kafka-server-stop.sh
    ;;
  status)
    if [ -f $PID_FILE ] && kill -0 $(cat $PID_FILE) 2>/dev/null; then
      echo "Kafka is running (PID: $(cat $PID_FILE))"
    else
      echo "Kafka is not running"
    fi
    ;;
esac
```

---

## SSL/TLS 인증서 생성 (선택)

인증서는 환경마다 새로 생성. 아래 절차를 참고.

```bash
CERT_DIR=/conf/kafka/certs
mkdir -p $CERT_DIR

# 1. san.cnf 작성 (IP/호스트명은 환경에 맞게 수정)
cat > $CERT_DIR/san.cnf << 'CNF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=KR
ST=Seoul
L=Seoul
O=cruxsiem
CN=sentinel

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = sentinel
DNS.2 = pipeline
DNS.3 = webui
DNS.4 = localhost
IP.1  = 127.0.0.1
IP.2  = <OPENSEARCH_IP>
IP.3  = <KAFKA_IP>
IP.4  = <WEBUI_IP>
CNF

# 2. CA 키 및 인증서 생성
openssl genrsa -out $CERT_DIR/ca.key 4096
openssl req -new -x509 -days 3650 -key $CERT_DIR/ca.key -out $CERT_DIR/ca.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=cruxsiem/CN=cruxsiem-ca"

# 3. 사이트 키 및 CSR 생성
openssl genrsa -out $CERT_DIR/site.key 2048
openssl req -new -key $CERT_DIR/site.key -out $CERT_DIR/site.csr \
  -config $CERT_DIR/san.cnf

# 4. CA로 서명
openssl x509 -req -days 3650 -in $CERT_DIR/site.csr \
  -CA $CERT_DIR/ca.crt -CAkey $CERT_DIR/ca.key -CAcreateserial \
  -out $CERT_DIR/site.crt -extensions v3_req -extfile $CERT_DIR/san.cnf

# 5. PKCS12 keystore 생성 (비밀번호: changeit)
openssl pkcs12 -export -in $CERT_DIR/site.crt -inkey $CERT_DIR/site.key \
  -certfile $CERT_DIR/ca.crt -out $CERT_DIR/site.p12 \
  -passout pass:changeit -name sentinel
```

---

## 토픽별 용도

| 토픽 | 발행자 | 소비자 | 내용 |
|------|--------|--------|------|
| `threats` | Vector script | Vector | SentinelOne 위협 이벤트 |
| `agents` | Vector script | Vector | SentinelOne 에이전트 정보 |
| `edg` | EDR 에이전트 | Vector | EDR 이벤트 로그 |
| `heartbeat` | Heartbeat | Vector | 서비스 상태 체크 결과 |

