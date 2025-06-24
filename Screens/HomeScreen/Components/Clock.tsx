import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";

type ClockProps = {
  style?: object;  // Asegúrate de aceptar la propiedad style
};

const Clock: React.FC<ClockProps> = ({ style }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.clockContainer}>
        <Text style={styles.time}>{time.toLocaleTimeString()}</Text>
        <Text style={styles.date}>{time.toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  clockContainer: {
    top:35,
    backgroundColor: 'rgba(44, 62, 80,0.6)',
    padding: 40,
    borderRadius: 20,
    shadowColor: "#94C8EF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 50,
    alignItems: "center",
    marginBottom: 30, // Espacio debajo del reloj
  },
  time: {
    fontFamily: 'Georgia',
    fontSize: 40,
    fontWeight: "bold",
    color: "#F4E3D7",
  },
  date: {
    fontFamily: 'Georgia',
    fontSize: 18,
    color: "#F4E3D7",
    marginTop: 5,
  },
});

export default Clock;
