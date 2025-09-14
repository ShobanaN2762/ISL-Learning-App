# Dockerfile

# STAGE 1: Build the application using Maven
# UPDATED LINE: Switching to a more reliable Maven/JDK combo
FROM maven:3.9-eclipse-temurin-17 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven project file first
COPY pom.xml .

# Copy the rest of your source code
COPY src ./src

# Run the Maven package command to build the executable JAR
RUN mvn clean package -DskipTests


# STAGE 2: Create the final, lightweight runtime image
FROM eclipse-temurin:17-jre

# Set the working directory
WORKDIR /app

# Expose the port your application runs on
EXPOSE 8080

# Copy the final JAR file from the 'builder' stage
COPY --from=builder /app/target/*.jar app.jar

# Define the command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]