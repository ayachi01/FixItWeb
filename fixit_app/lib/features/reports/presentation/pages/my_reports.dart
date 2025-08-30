import 'package:flutter/material.dart';

class MyReportsPage extends StatelessWidget {
  final List<Map<String, dynamic>> reports = [
    {
      'id': 'FXT-250004',
      'visibility': 'Private',
      'title': 'Broken Chair',
      'description': 'One of the chairs is missing a leg...',
      'status': 'Submitted',
      'statusColor': Colors.black,
      'location': 'PTC',
      'likes': 0,
      'time': '07/26/25 10:26 AM',
      'image': 'assets/images/brokenchair.jpg',
    },
    {
      'id': 'FXT-250005',
      'visibility': 'Public',
      'title': 'Flickering Light',
      'description': 'Flickering light in NH hallway.',
      'status': 'In Progress',
      'statusColor': Colors.orange,
      'location': 'NH',
      'likes': 2,
      'time': '07/25/25 8:56 AM',
      'image': 'assets/images/brokenchair.jpg',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0XFFF8F8F8),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(100),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          automaticallyImplyLeading: false,
          toolbarHeight: 100,
          title: Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Row(
              children: const [
                Text(
                  "My ",
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w400,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "Reports",
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF386641),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search ticket',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: const Icon(Icons.filter_list),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView.builder(
                itemCount: reports.length,
                itemBuilder: (context, index) {
                  return ReportCard(report: reports[index]);
                },
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: const Color(0xFF386641),
        child: const Icon(Icons.qr_code_scanner),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 1,
        selectedItemColor: const Color(0xFF386641),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(
            icon: Icon(Icons.list_alt),
            label: 'My Reports',
          ),
        ],
        onTap: (index) {
          // Navigation logic here
        },
      ),
    );
  }
}

class ReportCard extends StatelessWidget {
  final Map<String, dynamic> report;

  const ReportCard({Key? key, required this.report}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final imagePath = report['image'];
    return Card(
      color: Colors.green.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                imagePath,
                height: 70,
                width: 70,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        report['id'],
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        report['visibility'],
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const Spacer(),
                      const Icon(Icons.more_vert, size: 20),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    report['title'],
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    report['description'],
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Text(
                        'Status: ',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        report['status'],
                        style: TextStyle(
                          color: report['statusColor'],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14),
                      const SizedBox(width: 4),
                      Text(report['location']),
                      const SizedBox(width: 16),
                      const Icon(Icons.thumb_up_alt_outlined, size: 14),
                      const SizedBox(width: 4),
                      Text('${report['likes']}'),
                      const Spacer(),
                      Text(
                        report['time'],
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
