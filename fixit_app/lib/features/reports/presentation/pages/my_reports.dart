import 'package:fixit/core/api_service.dart';
import 'package:fixit/core/services/image_picker_service.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '/features/reports/presentation/viewmodels/report_viewmodel.dart';
import 'package:fixit/features/dashboard/presentation/pages/homepage.dart';
import 'package:fixit/features/reports/presentation/pages/scanner_screen.dart';
import '/features/settings/presentation/pages/settings.dart';
import '/features/reports/presentation/pages/create_report.dart';
import '/core/widgets/bottom_nav_bar.dart';
import '/core/widgets/floating_action_button.dart';
import '/core/widgets/ticket_card.dart';

class MyReportsPage extends StatefulWidget {
  final TextEditingController? firstNameController;
  final TextEditingController? lastNameController;
  final TextEditingController? emailController;

  const MyReportsPage({
    super.key,
    this.firstNameController,
    this.lastNameController,
    this.emailController,
  });

  @override
  State<MyReportsPage> createState() => _MyReportsPageState();
}

class _MyReportsPageState extends State<MyReportsPage> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _tickets = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _selectedIndex = 1;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadMyReports();
  }

  Future<void> _loadMyReports() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await _apiService.getMyTickets();
      setState(() {
        _tickets = data;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Safely format location for both Map and int values
  String formatLocation(dynamic location) {
    if (location is Map<String, dynamic>) {
      final building = location['building_name'] ?? 'Unknown';
      final floor = location['floor_number'] ?? '';
      final room = location['room_identifier'] ?? '';
      return "$building $floor $room".trim();
    } else if (location != null) {
      return "Location ID: $location";
    } else {
      return "N/A";
    }
  }

  List<Map<String, dynamic>> get _filteredTickets {
    if (_searchQuery.isEmpty) return _tickets;
    return _tickets.where((ticket) {
      final title = (ticket['title'] ?? '').toString().toLowerCase();
      final status = (ticket['status'] ?? '').toString().toLowerCase();
      final locationText = formatLocation(ticket['location']).toLowerCase();
      return title.contains(_searchQuery.toLowerCase()) ||
          status.contains(_searchQuery.toLowerCase()) ||
          locationText.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
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
        child: RefreshIndicator(
          onRefresh: _loadMyReports,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: TextField(
                  onChanged: (value) {
                    setState(() => _searchQuery = value);
                  },
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
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF386641),
                        ),
                      )
                    : _errorMessage != null
                        ? Center(
                            child: Text(
                              "⚠️ $_errorMessage",
                              style: const TextStyle(color: Colors.redAccent),
                              textAlign: TextAlign.center,
                            ),
                          )
                        : _filteredTickets.isEmpty
                            ? Center(
                                child: Text(
                                  "No Reports Found",
                                  style: TextStyle(
                                    fontSize: 18,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              )
                            : ListView.builder(
                                itemCount: _filteredTickets.length,
                                itemBuilder: (context, index) {
                                  final report = _filteredTickets[index];

                                  // Include location_name in ticketData
                                  final ticketData = {
                                    "id": report['id'],
                                    "title": report['title'] ?? "Untitled Ticket",
                                    "status": report['status'] ?? "Unknown",
                                    "description": report['description'] ?? "No details",
                                    "location": formatLocation(report['location']),
                                    "location_name": report['location_name'],
                                    "created_at": report['created_at'],
                                    "updated_at": report['updated_at'],
                                    "priority": report['priority'] ?? "Normal",
                                    "images": report['images'] ?? [],
                                  };

                                  return TicketCard(report: ticketData);
                                },
                              ),
              ),
            ],
          ),
        ),
      ),

      floatingActionButton: CustomFAB(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => ScannerScreen()),
          );
        },
      ),

      bottomNavigationBar: BottomNavBar(
        currentIndex: _selectedIndex,
        onTap: (index) async {
          setState(() {
            _selectedIndex = index;
          });

          if (index == 0) {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const HomePage()),
              (route) => false,
            );
          }

          if (index == 1) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const MyReportsPage()),
            );
          }

          /*
          if (index == 2) {
            final newReport = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChangeNotifierProvider(
                  create: (_) => ReportViewModel(ImagePickerService()),
                  child: const CreateReport(),
                ),
              ),
            );

            if (newReport != null) {
              setState(() {
                _tickets.insert(0, newReport);
              });
            }
          }
          */

          if (index == 2) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => Settings(
                  firstNameController: widget.firstNameController,
                  lastNameController: widget.lastNameController,
                  emailController: widget.emailController,
                ),
              ),
            );
          }
        },
      ),
    );
  }
}
