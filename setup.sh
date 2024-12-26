#!/bin/bash

# Define the port number
PORT=2443

# Update the package list and install Java
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk

# Create a directory for the Minecraft server
mkdir -p ~/minecraft-server
cd ~/minecraft-server

# Download the Minecraft server .jar file
wget https://launcher.mojang.com/v1/objects/7d7efb8e3b38c3c20897ef13ed6cd8f922b807b9/server.jar -O minecraft_server.1.18.2.jar

# Agree to the EULA
echo "eula=true" > eula.txt

# Create server.properties file to specify the port and other settings
cat <<EOL > server.properties
server-port=${PORT}
online-mode=false
enable-command-block=true
allow-flight=true
EOL

# Run the Minecraft server in a screen session
screen -S minecraft -d -m java -Xmx2G -Xms2G -jar minecraft_server.1.18.2.jar nogui

# Wait for the server to start
sleep 10

# Fetch and display the public IP address and port
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Minecraft server is running at ${PUBLIC_IP}:${PORT}"
