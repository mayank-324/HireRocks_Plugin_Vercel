import React, { useState, useEffect } from "react";
import { Table, Button, message, Card } from "antd";
import {
  fetchZohoProjects,
  syncProjectsToHireRocks,
} from "../integrations/zoho/zohoApi";

const JobSyncStep = ({ onNext }) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchZohoProjects();
        setProjects(data);
      } catch (e) {
        message.error("Failed to load projects from Zoho");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSync = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select at least one project to sync");
      return;
    }
    setLoading(true);
    try {
      const selectedData = projects.filter((p) =>
        selectedRowKeys.includes(p.id)
      );
      await syncProjectsToHireRocks(selectedData);
      message.success("Projects synced successfully!");
      onNext(); // Move to Employee Selection
    } catch (e) {
      message.error("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Step 2: Sync Projects from Zoho" className="shadow-lg">
      <p className="text-gray-500 mb-4">
        Select the Zoho projects you want to make available in the tracker.
      </p>
      <Table
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        dataSource={projects}
        rowKey="id"
        columns={[
          { title: "Project Name", dataIndex: "Project_Name", key: "name" },
          { title: "Zoho ID", dataIndex: "id", key: "id" },
        ]}
        pagination={{ pageSize: 5 }}
      />
      <div className="mt-6 flex justify-end gap-3">
        <Button onClick={onNext}>Skip</Button>
        <Button type="primary" loading={loading} onClick={handleSync}>
          Sync and Continue
        </Button>
      </div>
    </Card>
  );
};

export default JobSyncStep;
