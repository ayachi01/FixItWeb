import 'package:fixit/features/reports/presentation/pages/my_reports.dart';
import 'package:flutter/material.dart';

class ViewReport extends StatefulWidget {
  const ViewReport({super.key}); // Added const here

  @override
  ViewReportState createState() => ViewReportState();
}

class ViewReportState extends State<ViewReport> {
  String incidentType = 'Broken Chairs';
  String description = 'One of the chairs is missing a leg in PTC 305';
  String location = 'PTC';
  String date = '07/06/25';
  String time = '10:26 AM';
  String visibility = 'Private';

  List<String> imagePaths = ['assets/images/sample_brkn_chair.png'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("View Report"), centerTitle: true),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            sectionTitle("Incident Type"),
            readOnlyField(incidentType),
            sectionTitle("Description"),
            readOnlyField(description, maxLines: 3),
            sectionTitle("Location"),
            readOnlyField(location),
            sectionTitle("Date"),
            readOnlyField(date),
            sectionTitle("Time"),
            readOnlyField(time),
            sectionTitle("Visibility"),
            Row(
              children: [
                Radio<String>(
                  value: 'Public',
                  groupValue: visibility,
                  onChanged: (value) {
                    setState(() {
                      visibility = value!;
                    });
                  },
                ),
                Text("Public"),
                SizedBox(width: 20),
                Radio<String>(
                  value: 'Private',
                  groupValue: visibility,
                  onChanged: (value) {
                    setState(() {
                      visibility = value!;
                    });
                  },
                ),
                Text("Private"),
              ],
            ),
            sectionTitle("Images"),
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: imagePaths
                    .map(
                      (path) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Image.asset(path, width: 80),
                      ),
                    )
                    .toList(),
              ),
            ),
            SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green[700],
                  foregroundColor: Colors.white,
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => MyReportsPage(),
                    ), // temporary navigation
                  );
                },
                child: Text("Back"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 4),
      child: Text(title, style: TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  Widget readOnlyField(String value, {int maxLines = 1}) {
    return TextField(
      readOnly: true,
      maxLines: maxLines,
      decoration: InputDecoration(
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(),
        hintText: value,
      ),
    );
  }
}
