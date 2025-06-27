import requests

def main():
    print("Hello from Python!")
    response = requests.get("https://httpbin.org/get")
    print(response.status_code)

if __name__ == "__main__":
    main()
