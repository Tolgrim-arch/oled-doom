/*
 * DOOM-Style Controller for Arduino Mega 2560 / UNO (KY-023 Joystick Only)
 * Hardware:
 *  - KY-023: VRx -> A0, VRy -> A1, SW -> D10, +5V -> 5V, GND -> GND
 *
 * Protocol (115200 baud):
 *  TX: "x,y,sw\n" (e.g. "512,508,1\n" where sw=0 means pressed)
 *  RX: "FPS:60\n" (ready for future OLED display)
 */

const int PIN_VRX = A0;
const int PIN_VRY = A1;
const int PIN_SW  = 10;

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 25; // 40 Hz

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SW, INPUT_PULLUP);
}

void loop() {
  if (Serial.available() > 0) {
    Serial.readStringUntil('\n');
  }

  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;

    int x  = analogRead(PIN_VRX);
    int y  = analogRead(PIN_VRY);
    int sw = digitalRead(PIN_SW); // 0 = presionado, 1 = suelto

    Serial.print(x);
    Serial.print(',');
    Serial.print(y);
    Serial.print(',');
    Serial.println(sw);
  }
}
