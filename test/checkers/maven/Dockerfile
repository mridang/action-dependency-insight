
# Use Maven with OpenJDK 17 for building the project
FROM maven:3.8.4-openjdk-17 AS build

# Set the working directory
WORKDIR /app

# Copy the pom.xml to cache dependencies
COPY pom.xml ./

# Install dependencies (only once)
RUN mvn dependency:go-offline

# Copy the entire project
COPY . .

# Build the project
RUN mvn clean install -DskipTests

# Now, run the dependency analyzer plugin to analyze unused dependencies
RUN mvn dependency:analyze

# Set the default command
CMD ["java", "-cp", "target/sample-java-1.0-SNAPSHOT.jar", "com.example.HelloWorld"]
