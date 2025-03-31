import csv
import requests
from bs4 import BeautifulSoup
import time
import pandas as pd
from urllib.parse import quote
import re

def clean_professor_name(name):
    """
    Clean professor name by removing middle names, suffixes, etc.
    Keep only last name and first initial.
    """
    parts = name.split()
    if len(parts) >= 2:
        # Get last name (last part)
        last_name = parts[-1]
        # Get first initial (first letter of first part)
        first_initial = parts[0][0] if parts[0] else ''
        return f"{first_initial} {last_name}"
    return name

def get_rmp_comment(professor_name, professor_id):
    """
    Get professor comments from RateMyProfessors
    """
    url = f"https://www.ratemyprofessors.com/professor/{professor_id}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        # Send search request
        response = requests.get(url=url, headers=headers)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract top 3 comments
        reviews = []
        review_cards = soup.select('[class*="StyledComments"]')[:3]
        
        for comment in review_cards:
            # Extract comment text
            if comment:
                comment_text = comment.text.strip()

                # Clean up extra spaces and newlines
                comment_text = ' '.join(comment_text.split())

                reviews.append(comment_text)
        # Ensure we always return exactly 3 reviews (fill with None if fewer than 3)
        while len(reviews) < 3:
            reviews.append(None)
            
        return reviews

    except Exception as e:
        print(f"Error searching for {professor_name}: {str(e)}")
        return [None, None, None]

def get_rmp_rating(professor_name, university_name="Syracuse University"):
    """
    Get professor rating from RateMyProfessors
    """
    base_url = "https://www.ratemyprofessors.com"
    search_url = f"{base_url}/search/professors/992?q={quote(professor_name)}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Send search request
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find professor card
        professor_card = soup.select_one('[class*="StyledTeacherCard"]')
        if not professor_card:
            return None
        
        # Extract rating
        rating = professor_card.select_one('[class*="CardNumRatingNumber"]')

        if rating:
            rating = rating.text.strip()
        
        # Extract professor detail page link
        link = professor_card['href']
        if link:
            link = link.split('/')[-1]

        reviews = get_rmp_comment(professor_name, link)

        # print(reviews)
        
        return {
            'name': professor_name,
            'rating': rating,
            'review1': reviews[0] if reviews else None,
            'review2': reviews[1] if len(reviews) > 1 else None,
            'review3': reviews[2] if len(reviews) > 2 else None
        }
    
    except Exception as e:
        print(f"Error searching for {professor_name}: {str(e)}")
        return None

def process_csv(input_file, output_file):
    """
    Process CSV file to add professor rating information
    """
    # Read input CSV
    df = pd.read_csv(input_file)
    
    # Prepare results list
    results = []
    
    # Iterate through each row
    st = set()
    for index, row in df.iterrows():
        instructor = row['Instructor']
        if instructor in st:
            continue
        st.add(instructor)

        if pd.isna(instructor) or instructor == 'N/A':
            results.append({
                'Instructor': row['Instructor'],
                'RMP_Rating': None,
                'RMP_Review1': None,
                'RMP_Review2': None,
                'RMP_Review3': None
            })
            continue
        
        # Clean professor name
        # cleaned_name = clean_professor_name(instructor)
        cleaned_name = instructor
        print(f"Searching for: {cleaned_name}")
        
        # Get rating
        rating_info = get_rmp_rating(cleaned_name)
        
        print(rating_info)

        # Add to results
        results.append({
            'Instructor': row['Instructor'],
            'RMP_Rating': rating_info['rating'] if rating_info else None,
            'RMP_Review1': rating_info['review1'] if rating_info else None,
            'RMP_Review2': rating_info['review2'] if rating_info else None,
            'RMP_Review3': rating_info['review3'] if rating_info else None
        })
        
        # time.sleep(2)
    
    # Save results to new CSV
    result_df = pd.DataFrame(results)
    result_df.to_csv(output_file, index=False)
    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    input_csv = "courses.csv" 
    output_csv = "courses_with_ratings.csv"
    
    process_csv(input_csv, output_csv)