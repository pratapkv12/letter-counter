#!/usr/bin/env python3
"""
Excel Export Utility for ColdStorm.AI
Generates comprehensive Excel reports for campaigns, leads, and analytics
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import requests
from dotenv import load_dotenv
import xlsxwriter
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.chart import LineChart, BarChart, PieChart, Reference
from openpyxl.utils.dataframe import dataframe_to_rows

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExcelReportGenerator:
    def __init__(self):
        self.backend_url = os.getenv('API_BASE_URL', 'http://localhost:3000')
        self.output_dir = os.path.join(os.path.dirname(__file__), 'reports')
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Define styles
        self.styles = {
            'header': {
                'font': Font(bold=True, color='FFFFFF'),
                'fill': PatternFill(start_color='366092', end_color='366092', fill_type='solid'),
                'alignment': Alignment(horizontal='center', vertical='center')
            },
            'subheader': {
                'font': Font(bold=True, color='000000'),
                'fill': PatternFill(start_color='D9E2F3', end_color='D9E2F3', fill_type='solid'),
                'alignment': Alignment(horizontal='center', vertical='center')
            },
            'data': {
                'alignment': Alignment(horizontal='left', vertical='center')
            },
            'number': {
                'alignment': Alignment(horizontal='right', vertical='center')
            },
            'percentage': {
                'alignment': Alignment(horizontal='right', vertical='center'),
                'number_format': '0.0%'
            },
            'currency': {
                'alignment': Alignment(horizontal='right', vertical='center'),
                'number_format': '$#,##0.00'
            }
        }

    def fetch_data(self, endpoint: str) -> Optional[Dict]:
        """Fetch data from backend API"""
        try:
            response = requests.get(f"{self.backend_url}/api{endpoint}", timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"❌ Failed to fetch data from {endpoint}: {str(e)}")
            return None

    def apply_style(self, cell, style_name: str):
        """Apply predefined style to a cell"""
        if style_name in self.styles:
            style = self.styles[style_name]
            if 'font' in style:
                cell.font = style['font']
            if 'fill' in style:
                cell.fill = style['fill']
            if 'alignment' in style:
                cell.alignment = style['alignment']
            if 'number_format' in style:
                cell.number_format = style['number_format']

    def create_campaign_summary_report(self) -> str:
        """Generate comprehensive campaign summary report"""
        logger.info("📊 Generating campaign summary report...")
        
        # Fetch data
        campaigns_data = self.fetch_data('/analytics/campaigns') or {}
        leads_data = self.fetch_data('/analytics/lead-segments') or {}
        performance_data = self.fetch_data('/analytics/performance') or {}
        
        # Create workbook
        wb = Workbook()
        
        # Remove default sheet
        wb.remove(wb.active)
        
        # Create sheets
        self._create_overview_sheet(wb, campaigns_data, leads_data, performance_data)
        self._create_campaigns_sheet(wb, campaigns_data)
        self._create_leads_sheet(wb, leads_data)
        self._create_performance_sheet(wb, performance_data)
        self._create_analytics_sheet(wb, performance_data)
        
        # Save file
        filename = f"campaign_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(self.output_dir, filename)
        wb.save(filepath)
        
        logger.info(f"✅ Campaign summary report saved: {filepath}")
        return filepath

    def _create_overview_sheet(self, wb: Workbook, campaigns_data: Dict, leads_data: Dict, performance_data: Dict):
        """Create overview sheet with key metrics"""
        ws = wb.create_sheet("Overview", 0)
        
        # Title
        ws['A1'] = "ColdStorm.AI Campaign Overview"
        ws['A1'].font = Font(size=16, bold=True)
        ws.merge_cells('A1:F1')
        
        # Date range
        ws['A3'] = f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        ws['A3'].font = Font(italic=True)
        
        # Key Metrics Section
        row = 5
        ws[f'A{row}'] = "KEY METRICS"
        self.apply_style(ws[f'A{row}'], 'header')
        ws.merge_cells(f'A{row}:B{row}')
        
        metrics = [
            ("Total Campaigns", campaigns_data.get('total_campaigns', 0)),
            ("Total Leads", leads_data.get('total_leads', 0)),
            ("Emails Sent", performance_data.get('total_sent', 0)),
            ("Open Rate", performance_data.get('open_rate', 0)),
            ("Reply Rate", performance_data.get('reply_rate', 0)),
            ("Hot Leads", leads_data.get('hot_leads', 0)),
        ]
        
        for i, (metric, value) in enumerate(metrics, start=row+1):
            ws[f'A{i}'] = metric
            if 'Rate' in metric:
                ws[f'B{i}'] = value
                self.apply_style(ws[f'B{i}'], 'percentage')
            else:
                ws[f'B{i}'] = value
                self.apply_style(ws[f'B{i}'], 'number')
        
        # Lead Segments Section
        row += len(metrics) + 2
        ws[f'A{row}'] = "LEAD SEGMENTS"
        self.apply_style(ws[f'A{row}'], 'header')
        ws.merge_cells(f'A{row}:C{row}')
        
        segments = [
            ("Hot Leads (80-100%)", leads_data.get('hot_leads', 0)),
            ("Warm Leads (60-79%)", leads_data.get('warm_leads', 0)),
            ("Cold Leads (40-59%)", leads_data.get('cold_leads', 0)),
            ("Nurture Leads (0-39%)", leads_data.get('nurture_leads', 0)),
        ]
        
        for i, (segment, count) in enumerate(segments, start=row+1):
            ws[f'A{i}'] = segment
            ws[f'B{i}'] = count
            total_leads = leads_data.get('total_leads', 1)
            ws[f'C{i}'] = count / total_leads if total_leads > 0 else 0
            self.apply_style(ws[f'C{i}'], 'percentage')
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width

    def _create_campaigns_sheet(self, wb: Workbook, campaigns_data: Dict):
        """Create detailed campaigns sheet"""
        ws = wb.create_sheet("Campaigns")
        
        # Headers
        headers = [
            "Campaign Name", "Status", "Created Date", "Leads Count", 
            "Emails Sent", "Opened", "Clicked", "Replied", 
            "Open Rate", "Click Rate", "Reply Rate"
        ]
        
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col, value=header)
            self.apply_style(cell, 'header')
        
        # Sample data (in production, this would come from the API)
        campaigns = campaigns_data.get('campaigns', [
            {
                'name': 'Q4 Tech Outreach',
                'status': 'Active',
                'created_date': '2024-01-01',
                'leads_count': 156,
                'emails_sent': 156,
                'opened': 44,
                'clicked': 15,
                'replied': 12,
                'open_rate': 0.282,
                'click_rate': 0.096,
                'reply_rate': 0.077
            },
            {
                'name': 'SaaS Startup Follow-up',
                'status': 'Active',
                'created_date': '2024-01-08',
                'leads_count': 89,
                'emails_sent': 89,
                'opened': 28,
                'clicked': 9,
                'replied': 9,
                'open_rate': 0.315,
                'click_rate': 0.101,
                'reply_rate': 0.101
            }
        ])
        
        for row, campaign in enumerate(campaigns, start=2):
            ws.cell(row=row, column=1, value=campaign.get('name', ''))
            ws.cell(row=row, column=2, value=campaign.get('status', ''))
            ws.cell(row=row, column=3, value=campaign.get('created_date', ''))
            ws.cell(row=row, column=4, value=campaign.get('leads_count', 0))
            ws.cell(row=row, column=5, value=campaign.get('emails_sent', 0))
            ws.cell(row=row, column=6, value=campaign.get('opened', 0))
            ws.cell(row=row, column=7, value=campaign.get('clicked', 0))
            ws.cell(row=row, column=8, value=campaign.get('replied', 0))
            
            # Apply percentage formatting to rate columns
            for col in [9, 10, 11]:
                rate_key = ['open_rate', 'click_rate', 'reply_rate'][col-9]
                cell = ws.cell(row=row, column=col, value=campaign.get(rate_key, 0))
                self.apply_style(cell, 'percentage')
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 30)
            ws.column_dimensions[column_letter].width = adjusted_width

    def _create_leads_sheet(self, wb: Workbook, leads_data: Dict):
        """Create detailed leads sheet"""
        ws = wb.create_sheet("Leads")
        
        # Headers
        headers = [
            "Name", "Email", "Company", "Position", "Industry", 
            "Score", "Segment", "Status", "Last Activity", "Campaign"
        ]
        
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col, value=header)
            self.apply_style(cell, 'header')
        
        # Sample leads data
        leads = leads_data.get('leads', [
            {
                'name': 'John Smith',
                'email': 'john@techcorp.com',
                'company': 'TechCorp Inc',
                'position': 'CTO',
                'industry': 'Technology',
                'score': 0.85,
                'segment': 'Hot',
                'status': 'Replied',
                'last_activity': 'Opened email 3 times',
                'campaign': 'Q4 Tech Outreach'
            },
            {
                'name': 'Sarah Johnson',
                'email': 'sarah@startup.io',
                'company': 'Startup.io',
                'position': 'CEO',
                'industry': 'SaaS',
                'score': 0.92,
                'segment': 'Hot',
                'status': 'Interested',
                'last_activity': 'Clicked pricing link',
                'campaign': 'SaaS Startup Follow-up'
            }
        ])
        
        for row, lead in enumerate(leads, start=2):
            ws.cell(row=row, column=1, value=lead.get('name', ''))
            ws.cell(row=row, column=2, value=lead.get('email', ''))
            ws.cell(row=row, column=3, value=lead.get('company', ''))
            ws.cell(row=row, column=4, value=lead.get('position', ''))
            ws.cell(row=row, column=5, value=lead.get('industry', ''))
            
            # Score with percentage formatting
            score_cell = ws.cell(row=row, column=6, value=lead.get('score', 0))
            self.apply_style(score_cell, 'percentage')
            
            ws.cell(row=row, column=7, value=lead.get('segment', ''))
            ws.cell(row=row, column=8, value=lead.get('status', ''))
            ws.cell(row=row, column=9, value=lead.get('last_activity', ''))
            ws.cell(row=row, column=10, value=lead.get('campaign', ''))
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 40)
            ws.column_dimensions[column_letter].width = adjusted_width

    def _create_performance_sheet(self, wb: Workbook, performance_data: Dict):
        """Create performance metrics sheet with charts"""
        ws = wb.create_sheet("Performance")
        
        # Daily performance data
        ws['A1'] = "Daily Performance Metrics"
        self.apply_style(ws['A1'], 'header')
        ws.merge_cells('A1:E1')
        
        # Headers
        headers = ["Date", "Emails Sent", "Opened", "Replied", "Open Rate"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=2, column=col, value=header)
            self.apply_style(cell, 'subheader')
        
        # Sample daily data
        daily_data = [
            ('2024-01-01', 45, 12, 3, 0.267),
            ('2024-01-02', 52, 18, 5, 0.346),
            ('2024-01-03', 38, 15, 4, 0.395),
            ('2024-01-04', 61, 22, 7, 0.361),
            ('2024-01-05', 55, 19, 6, 0.345),
            ('2024-01-06', 48, 16, 4, 0.333),
            ('2024-01-07', 67, 25, 8, 0.373),
        ]
        
        for row, (date, sent, opened, replied, open_rate) in enumerate(daily_data, start=3):
            ws.cell(row=row, column=1, value=date)
            ws.cell(row=row, column=2, value=sent)
            ws.cell(row=row, column=3, value=opened)
            ws.cell(row=row, column=4, value=replied)
            rate_cell = ws.cell(row=row, column=5, value=open_rate)
            self.apply_style(rate_cell, 'percentage')
        
        # Create line chart for performance trends
        chart = LineChart()
        chart.title = "Email Performance Trend"
        chart.style = 13
        chart.x_axis.title = 'Date'
        chart.y_axis.title = 'Count'
        
        # Data for chart
        data = Reference(ws, min_col=2, min_row=2, max_col=4, max_row=len(daily_data)+2)
        cats = Reference(ws, min_col=1, min_row=3, max_row=len(daily_data)+2)
        
        chart.add_data(data, titles_from_data=True)
        chart.set_categories(cats)
        
        ws.add_chart(chart, "G2")

    def _create_analytics_sheet(self, wb: Workbook, performance_data: Dict):
        """Create analytics and insights sheet"""
        ws = wb.create_sheet("Analytics")
        
        # Title
        ws['A1'] = "Campaign Analytics & Insights"
        self.apply_style(ws['A1'], 'header')
        ws.merge_cells('A1:D1')
        
        # Key insights
        insights = [
            "📈 Top Performing Campaign: Q4 Tech Outreach (28.2% open rate)",
            "🔥 Hot Leads Generated: 15 leads requiring immediate attention",
            "📧 Best Send Time: Tuesday 10:00 AM (35% open rate)",
            "🎯 Industry Performance: Technology sector shows highest engagement",
            "💡 Recommendation: Focus on C-level positions for better response rates",
            "📊 Trend: Open rates improving by 2.3% week-over-week",
        ]
        
        row = 3
        for insight in insights:
            ws[f'A{row}'] = insight
            row += 1
        
        # Performance by industry
        row += 2
        ws[f'A{row}'] = "Performance by Industry"
        self.apply_style(ws[f'A{row}'], 'subheader')
        ws.merge_cells(f'A{row}:D{row}')
        
        industry_data = [
            ("Technology", 45, 15, 0.333),
            ("SaaS", 38, 14, 0.368),
            ("Healthcare", 32, 8, 0.250),
            ("Finance", 28, 9, 0.321),
            ("Manufacturing", 25, 6, 0.240),
        ]
        
        headers = ["Industry", "Emails Sent", "Opened", "Open Rate"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=row+1, column=col, value=header)
            self.apply_style(cell, 'subheader')
        
        for i, (industry, sent, opened, rate) in enumerate(industry_data, start=row+2):
            ws.cell(row=i, column=1, value=industry)
            ws.cell(row=i, column=2, value=sent)
            ws.cell(row=i, column=3, value=opened)
            rate_cell = ws.cell(row=i, column=4, value=rate)
            self.apply_style(rate_cell, 'percentage')

    def create_leads_export(self, leads_data: List[Dict]) -> str:
        """Export leads data to Excel"""
        logger.info("📊 Exporting leads data...")
        
        # Convert to DataFrame
        df = pd.DataFrame(leads_data)
        
        # Create filename
        filename = f"leads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(self.output_dir, filename)
        
        # Write to Excel with formatting
        with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Leads', index=False)
            
            # Get workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets['Leads']
            
            # Define formats
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#366092',
                'font_color': 'white',
                'border': 1
            })
            
            # Apply header format
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            # Auto-adjust column widths
            for i, col in enumerate(df.columns):
                column_len = max(df[col].astype(str).str.len().max(), len(str(col))) + 2
                worksheet.set_column(i, i, min(column_len, 50))
        
        logger.info(f"✅ Leads export saved: {filepath}")
        return filepath

    def create_custom_report(self, report_config: Dict) -> str:
        """Create custom report based on configuration"""
        logger.info("📊 Creating custom report...")
        
        # Fetch data based on config
        data = {}
        for endpoint in report_config.get('data_sources', []):
            data[endpoint] = self.fetch_data(endpoint)
        
        # Create workbook
        wb = Workbook()
        wb.remove(wb.active)
        
        # Create sheets based on config
        for sheet_config in report_config.get('sheets', []):
            self._create_custom_sheet(wb, sheet_config, data)
        
        # Save file
        filename = f"{report_config.get('name', 'custom_report')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(self.output_dir, filename)
        wb.save(filepath)
        
        logger.info(f"✅ Custom report saved: {filepath}")
        return filepath

    def _create_custom_sheet(self, wb: Workbook, sheet_config: Dict, data: Dict):
        """Create custom sheet based on configuration"""
        ws = wb.create_sheet(sheet_config['name'])
        
        # Add title if specified
        if 'title' in sheet_config:
            ws['A1'] = sheet_config['title']
            self.apply_style(ws['A1'], 'header')
        
        # Add data based on config
        # This would be expanded based on specific requirements

def main():
    """Main function to generate Excel reports"""
    generator = ExcelReportGenerator()
    
    if len(sys.argv) > 1:
        report_type = sys.argv[1].lower()
        
        if report_type == 'summary':
            generator.create_campaign_summary_report()
        elif report_type == 'leads':
            # Sample leads data for demonstration
            sample_leads = [
                {'name': 'John Doe', 'email': 'john@example.com', 'company': 'Example Corp'},
                {'name': 'Jane Smith', 'email': 'jane@test.com', 'company': 'Test Inc'}
            ]
            generator.create_leads_export(sample_leads)
        else:
            print("Usage: python excel_writer.py [summary|leads]")
    else:
        # Default: create summary report
        generator.create_campaign_summary_report()

if __name__ == "__main__":
    main()